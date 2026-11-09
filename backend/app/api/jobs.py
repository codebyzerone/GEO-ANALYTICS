from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

router = APIRouter()

# Simple in-memory job store (replace with DB in production)
jobs_db: dict = {}


@router.post("/jobs")
def create_job(background: BackgroundTasks, brand_name: str = Query(...), queries: list = Query(...)):
    """Create a new analysis job that runs in the background.

    Returns a job_id that can be polled via GET /jobs/{job_id}.
    The analysis runs in the background and stores the result in jobs_db.
    """
    import uuid
    from app.services.analysis_pipeline import run_analysis_pipeline

    job_id = str(uuid.uuid4())
    jobs_db[job_id] = {"status": "pending", "result": None, "brand": brand_name, "queries": queries}

    def run_job() -> None:
        try:
            result = run_analysis_pipeline(brand_name, queries)
            jobs_db[job_id] = {"status": "completed", "result": result, "brand": brand_name, "queries": queries}
        except Exception as e:
            jobs_db[job_id] = {"status": "failed", "result": str(e), "brand": brand_name, "queries": queries}

    # Run the analysis in the background so the response returns immediately.
    background.add_task(run_job)
    return {"job_id": job_id}


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    """Return job status and result if completed."""
    job = jobs_db.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, "status": job["status"], "result": job["result"]}