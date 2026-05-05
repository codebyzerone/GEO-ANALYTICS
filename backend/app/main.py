from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from app.services.llm_service import query_all_llms
from app.services.nlp_service import analyze_all_responses
from app.services.scoring_service import calculate_visibility_report

app = FastAPI(title="GEO Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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