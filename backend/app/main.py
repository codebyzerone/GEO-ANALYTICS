import json
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from app.core.config import settings
from app.services.llm_service import query_all_llms
from app.services.nlp_service import analyze_all_responses
from app.services.scoring_service import calculate_visibility_report

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

_cors_origins = [o.strip() for o in settings.CORS_ALLOW_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the demo sample report (matches the real /analyze response schema).
_SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "data", "sample_report.json")
with open(_SAMPLE_PATH, "r", encoding="utf-8") as _f:
    SAMPLE_REPORT = json.load(_f)


class AnalysisRequest(BaseModel):
    brand_name: str
    queries: List[str]


@app.get("/")
def root():
    return {"status": "GEO Analytics API running 🚀"}


@app.post("/analyze")
async def analyze_brand(request: AnalysisRequest):
    all_reports = []

    for query in request.queries:
        llm_results = query_all_llms(query)
        nlp_results = analyze_all_responses(
            llm_results["responses"],
            request.brand_name
        )
        report = calculate_visibility_report(nlp_results, request.brand_name)
        report["query"] = query
        all_reports.append(report)

    avg_score = sum(r["overall_score"] for r in all_reports) / len(all_reports)

    return {
        "brand": request.brand_name,
        "total_queries": len(request.queries),
        "average_geo_score": round(avg_score, 2),
        "query_reports": all_reports
    }


@app.get("/demo/sample")
def get_demo_sample():
    """Return a pre-built sample report matching the /analyze response schema.

    The brand is clearly fictional (NovaPay Sample) and the payload is flagged
    with is_sample=true so clients can display a visible "Sample data" banner.
    Zero LLM setup is required.
    """
    return SAMPLE_REPORT


@app.get("/health")
def health():
    return {"status": "ok"}