from fastapi import APIRouter, BackgroundTasks, HTTPException

router = APIRouter()

# Simple in-memory job store (replace with DB in production)
jobs_db: dict = {}


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    """Return job status and result if completed."""
    job = jobs_db.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, "status": job["status"], "result": job["result"]}