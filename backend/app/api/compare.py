import csv
import io
import json
from typing import List, Optional

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.services.analysis_pipeline import run_analysis_pipeline, persist_analysis_run

router = APIRouter()


class CompareRequest:
    """Validated compare request: 2-3 brands, same queries."""

    def __init__(self, brand_names: List[str], queries: List[str]):
        if len(brand_names) < 2 or len(brand_names) > 3:
            raise ValueError("compare requires 2 to 3 brands")
        if not queries:
            raise ValueError("queries must not be empty")
        self.brand_names = brand_names
        self.queries = queries


@router.post("/compare")
def compare_brands(brand_names: List[str] = Query(...), queries: List[str] = Query(...)):
    """Run the analysis pipeline for 2-3 brands on the same queries.

    Returns per-brand reports plus a comparison summary. Reuses the shared
    analysis pipeline — no scoring logic is duplicated.
    """
    try:
        req = CompareRequest(brand_names, queries)
    except ValueError as e:
        return {"error": str(e)}

    results = {}
    for brand in req.brand_names:
        report = run_analysis_pipeline(brand, req.queries)
        persist_analysis_run(report, req.queries)
        results[brand] = report

    # Comparison summary: average score per brand, sorted desc
    summary = sorted(
        [
            {"brand": b, "average_geo_score": results[b]["average_geo_score"]}
            for b in req.brand_names
        ],
        key=lambda x: x["average_geo_score"],
        reverse=True,
    )

    return {
        "queries": req.queries,
        "brands": req.brand_names,
        "results": results,
        "summary": summary,
    }


@router.get("/export/csv")
def export_csv(brand: Optional[str] = Query(None)):
    """Export a brand's latest analysis as CSV.

    Columns: brand, query, overall_score, grade, per_llm scores...
    """
    from app.core.database import SessionLocal
    from app.models.analysis_run import AnalysisRun

    db = SessionLocal()
    try:
        q = db.query(AnalysisRun)
        if brand:
            q = q.filter(AnalysisRun.brand_name == brand)
        run = q.order_by(AnalysisRun.created_at.desc()).first()
    except Exception:
        db.close()
        return {"error": "No analysis data available for export"}
    db.close()

    if not run:
        return {"error": "No analysis run found for export"}

    per_query = json.loads(run.per_query_scores)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["brand", "query", "overall_score", "created_at"])
    for pq in per_query:
        writer.writerow([run.brand_name, pq["query"], pq["score"], run.created_at.isoformat()])
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{run.brand_name}_analysis.csv"'
        },
    )
