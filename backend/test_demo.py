from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# Top-level keys of the real POST /analyze response schema.
ANALYZE_SCHEMA = {
    "brand": str,
    "total_queries": int,
    "average_geo_score": (int, float),
    "query_reports": list,
}
QUERY_REPORT_KEYS = {"query", "brand", "overall_score", "grade", "per_llm"}
PER_LLM_KEYS = {"score", "mentioned", "position", "sentiment", "mention_count"}


def test_demo_sample_endpoint_returns_200():
    """GET /demo/sample must be reachable with zero LLM setup."""
    response = client.get("/demo/sample")
    assert response.status_code == 200


def test_demo_sample_is_flagged_and_fictional():
    """The sample payload must be clearly labelled as sample/demo for a fictional brand."""
    data = client.get("/demo/sample").json()
    assert data.get("is_sample") is True
    assert "sample" in data["brand"].lower()


def test_demo_sample_matches_analyze_response_schema():
    """The sample report must match the real /analyze response schema exactly (only additive fields)."""
    data = client.get("/demo/sample").json()

    for key, expected_type in ANALYZE_SCHEMA.items():
        assert key in data, f"missing top-level key: {key}"
        assert isinstance(data[key], expected_type), f"wrong type for {key}: {type(data[key])}"

    assert len(data["query_reports"]) == data["total_queries"]
    assert 0 <= data["average_geo_score"] <= 100

    for report in data["query_reports"]:
        assert QUERY_REPORT_KEYS.issubset(report.keys()), report.keys()
        assert isinstance(report["per_llm"], dict) and len(report["per_llm"]) > 0
        for llm_name, metrics in report["per_llm"].items():
            assert PER_LLM_KEYS.issubset(metrics.keys()), (llm_name, metrics.keys())
            assert isinstance(metrics["score"], (int, float))
            assert isinstance(metrics["mentioned"], bool)
            assert 0 <= metrics["score"] <= 100