
import json
import os
import uuid
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import init_db
from app.api import history, compare, jobs
from app.services.analysis_pipeline import run_analysis_pipeline, persist_analysis_run

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app.router.lifespan_context = lifespan

app.include_router(history.router)
app.include_router(compare.router)
app.include_router(jobs.router)


class AnalysisRequest(BaseModel):
    brand_name: str
    queries: List[str]


@app.get("/")
def root():
    return {"status": "GEO Analytics API running 🚀"}


@app.post("/analyze")
async def analyze_brand(request: AnalysisRequest, background: BackgroundTasks):
    """Run analysis synchronously AND schedule an async job in background.

    The response is returned immediately from the sync pipeline (with caching).
    A background job is also persisted so the user can poll /jobs/{id} for
    the same result if they prefer async polling.
    """
    response = run_analysis_pipeline(request.brand_name, request.queries)
    persist_analysis_run(response, request.queries)

    # Schedule async job in background (same analysis, different path)
    job_id = str(uuid.uuid4())
    jobs_db[job_id] = {"status": "pending", "result": None, "brand": request.brand_name, "queries": request.queries}

    def background_job():
        try:
            # Re-run the pipeline and store result
            result = run_analysis_pipeline(request.brand_name, request.queries)
            persist_analysis_run(result, request.queries)
            jobs_db[job_id] = {"status": "completed", "result": result, "brand": request.brand_name, "queries": request.queries}
        except Exception as e:
            jobs_db[job_id] = {"status": "failed", "result": str(e), "brand": request.brand_name, "queries": request.queries}

    background.add_task(background_job)

    return {"job_id": job_id, **response}


# Simple in-memory job store (replace with DB in production)
jobs_db: dict = {}


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    """Return job status and result if completed."""
    job = jobs_db.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, "status": job["status"], "result": job["result"]}


@app.get("/demo/sample")
def demo_sample():
    """Return the demo/sample report, clearly labelled."""
    return {**SAMPLE_REPORT, "cached": False, "source": "demo"}


@app.get("/health")
def health():
    return {"status": "healthy", "service": "GEO Analytics API"}