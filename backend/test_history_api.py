import json
import os
import tempfile
from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Isolate history tests in a temp SQLite DB (never touches geo.db / geo_analytics.db).
db_fd, db_path = tempfile.mkstemp(suffix=".db")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{db_path}")

from app.core.config import get_settings  # noqa: E402
get_settings.cache_clear()

from app.main import app  # noqa: E402
from app.core.database import Base, get_db  # noqa: E402
from app.models.analysis_run import AnalysisRun  # noqa: E402

temp_engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=temp_engine)
TempSession = sessionmaker(autocommit=False, autoflush=False, bind=temp_engine)


def override_get_db():
    db = TempSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def _insert_run(brand, score, sentiment, created_at):
    db = TempSession()
    try:
        run = AnalysisRun(
            brand_name=brand,
            queries=json.dumps(["q1", "q2"]),
            overall_score=score,
            sentiment=sentiment,
            per_query_scores=json.dumps(
                [{"query": "q1", "score": score}, {"query": "q2", "score": score}]
            ),
            created_at=created_at,
        )
        db.add(run)
        db.commit()
    finally:
        db.close()


def test_history_returns_runs_for_brand_newest_first():
    """GET /history?brand=X returns runs for that brand, newest first."""
    base = datetime(2026, 1, 1)
    _insert_run("Acme", 50.0, "neutral", base)
    _insert_run("Acme", 80.0, "positive", base + timedelta(days=1))
    _insert_run("Other", 90.0, "positive", base)

    response = client.get("/history?brand=Acme")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Newest first
    assert data[0]["overall_score"] == 80.0
    assert data[0]["brand"] == "Acme"
    assert data[0]["queries"] == ["q1", "q2"]
    assert data[0]["sentiment"] == "positive"
    assert data[1]["overall_score"] == 50.0
    assert data[1]["sentiment"] == "neutral"


def test_history_filters_by_brand():
    """GET /history with brand param returns only that brand's runs."""
    base = datetime(2026, 2, 1)
    _insert_run("BrandA", 30.0, "negative", base)
    _insert_run("BrandB", 70.0, "positive", base)

    brand_a = client.get("/history?brand=BrandA").json()
    assert len(brand_a) == 1
    assert brand_a[0]["brand"] == "BrandA"

    all_runs = client.get("/history").json()
    assert len(all_runs) >= 3  # incl. Acme runs from previous test


def test_trends_returns_points_oldest_to_newest():
    """GET /trends?brand=X returns score points ordered oldest to newest."""
    base = datetime(2026, 3, 1)
    _insert_run("Trendy", 40.0, "negative", base)
    _insert_run("Trendy", 60.0, "neutral", base + timedelta(days=1))
    _insert_run("Trendy", 80.0, "positive", base + timedelta(days=2))

    response = client.get("/trends?brand=Trendy")
    assert response.status_code == 200
    data = response.json()
    assert data["brand"] == "Trendy"
    assert [p["score"] for p in data["points"]] == [40.0, 60.0, 80.0]
    assert data["points"][0]["date"] == base.isoformat()


def test_trends_empty_for_unknown_brand():
    """GET /trends for a brand with no runs returns empty points."""
    response = client.get("/trends?brand=NoSuchBrand")
    assert response.status_code == 200
    assert response.json()["points"] == []
