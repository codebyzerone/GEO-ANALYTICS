import json
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db, init_db
from app.models.analysis_run import AnalysisRun

router = APIRouter()


def _run_to_dict(run: AnalysisRun) -> dict:
    return {
        "id": run.id,
        "brand": run.brand_name,
        "queries": json.loads(run.queries),
        "overall_score": run.overall_score,
        "per_query_scores": json.loads(run.per_query_scores),
        "created_at": run.created_at.isoformat(),
    }


@router.post("/history/init")
def init_history(db: Session = Depends(get_db)):
    """Create the history table (idempotent)."""
    init_db()
    return {"status": "history ready"}


@router.get("/history")
def get_history(
    brand: Optional[str] = Query(None, description="Filter by brand name"),
    db: Session = Depends(get_db),
) -> List[dict]:
    """Return analysis runs, optionally filtered by brand. Newest first."""
    q = db.query(AnalysisRun)
    if brand:
        q = q.filter(AnalysisRun.brand_name == brand)
    runs = q.order_by(AnalysisRun.created_at.desc()).all()
    return [_run_to_dict(r) for r in runs]


@router.get("/trends")
def get_trends(
    brand: str = Query(..., description="Brand name to compute trends for"),
    db: Session = Depends(get_db),
) -> dict:
    """Return scores over time for a brand, ordered oldest to newest."""
    runs = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.brand_name == brand)
        .order_by(AnalysisRun.created_at.asc())
        .all()
    )
    points = [
        {"date": r.created_at.isoformat(), "score": r.overall_score, "brand": r.brand_name}
        for r in runs
    ]
    return {"brand": brand, "points": points}
