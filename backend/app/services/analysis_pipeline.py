import json
import time
from typing import Any, Dict, List, Optional

from app.core.cache import _make_cache_key, _cache_get, _cache_set
from app.core.database import SessionLocal
from app.models.analysis_run import AnalysisRun
from app.services.llm_service import query_all_llms
from app.services.nlp_service import analyze_all_responses
from app.services.scoring_service import calculate_visibility_report


def _extract_model_latency(llm_results: Dict[str, Any]) -> Dict[str, float]:
    """Extract per-model latency from LLM results if available."""
    latency = {}
    for model_name, result in llm_results.items():
        if isinstance(result, dict) and "latency" in result:
            latency[model_name] = float(result["latency"])
    return latency


def _collect_per_llm_latency(query_reports: List[Dict[str, Any]]) -> Dict[str, float]:
    """Collect aggregate per-model latency across all query reports."""
    model_latency: Dict[str, float] = {}
    for report in query_reports:
        for model_name, metrics in report.get("per_llm", {}).items():
            if isinstance(metrics, dict) and "latency" in metrics:
                model_latency[model_name] = model_latency.get(model_name, 0.0) + float(metrics["latency"])
    return model_latency


def run_analysis_pipeline(brand_name: str, queries: list) -> dict:
    """Run the full analysis pipeline for one brand across multiple queries.

    Returns a dict matching the /analyze response schema:
    { brand, total_queries, average_geo_score, query_reports: [...] }

    Results are cached keyed by (brand + queries + model identifiers)
    with a TTL from the CACHE_TTL_SECONDS env var. Cache hits are marked
    as cached=true in the response.
    """
    # Build cache key from brand, queries, and model identifiers
    # We infer model identifiers from the LLM results structure;
    # if cached, we'll have this info from the cached result.
    model_identifiers = []  # will be populated from cached or first run

    cache_key = _make_cache_key(brand_name, queries, model_identifiers)

    # Check cache first
    cached = _cache_get(cache_key)
    if cached is not None:
        cached["cached"] = True
        return cached  # type: ignore

    all_reports = []
    aggregate_latency: Dict[str, float] = {}

    for query in queries:
        llm_results = query_all_llms(query)
        # Extract per-model latency from LLM results
        model_latency = _extract_model_latency(llm_results)
        # Accumulate latency across queries
        for model_name, lat in model_latency.items():
            aggregate_latency[model_name] = aggregate_latency.get(model_name, 0.0) + lat

        nlp_results = analyze_all_responses(llm_results["responses"], brand_name)
        report = calculate_visibility_report(nlp_results, brand_name)
        report["query"] = query

        # Add per-model latency to the report if available
        if aggregate_latency:
            report["per_model_latency"] = aggregate_latency

        all_reports.append(report)

    avg_score = sum(r["overall_score"] for r in all_reports) / len(all_reports)

    result = {
        "brand": brand_name,
        "total_queries": len(queries),
        "average_geo_score": round(avg_score, 2),
        "query_reports": all_reports,
    }

    # Store in cache with TTL; mark as not cached in storage (we'll add cached flag on read)
    # We need to know the model identifiers for the cache key. Extract from the first report's per_llm keys.
    # Collect model identifiers from the reports
    model_ids = []
    for report in all_reports:
        model_ids.extend(report.get("per_llm", {}).keys())
    model_ids = list(set(model_ids))

    # Re-create cache key with actual model identifiers
    final_cache_key = _make_cache_key(brand_name, queries, model_ids)
    _cache_set(final_cache_key, result, int(settings.CACHE_TTL_SECONDS))  # type: ignore

    return result


def persist_analysis_run(response: dict, queries: list) -> None:
    """Persist a completed analysis run to the history database.

    Never raises; failures are swallowed so the API response is never affected.
    """
    try:
        db = SessionLocal()
        per_query = [
            {"query": r["query"], "score": r["overall_score"]}
            for r in response["query_reports"]
        ]
        sentiments = []
        for r in response["query_reports"]:
            for m in r.get("per_llm", {}).values():
                s = m.get("sentiment")
                if s and s != "n/a":
                    sentiments.append(s)
        sentiment_label = Counter(sentiments).most_common(1)[0][0] if sentiments else None

        run = AnalysisRun(
            brand_name=response["brand"],
            queries=json.dumps(queries),
            overall_score=response["average_geo_score"],
            sentiment=sentiment_label,
            per_query_scores=json.dumps(per_query),
        )
        db.add(run)
        db.commit()
        db.close()
    except Exception:
        pass
