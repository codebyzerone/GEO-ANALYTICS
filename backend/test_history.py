import json
from app.api.history import _run_to_dict


def test_run_to_dict():
    """_run_to_dict should convert an AnalysisRun model to a dict with correct keys."""

    class FakeRun:
        id = 1
        brand_name = "TestBrand"
        queries = json.dumps(["q1", "q2"])
        overall_score = 75.5
        per_query_scores = json.dumps([{"query": "q1", "score": 80.0}, {"query": "q2", "score": 71.0}])

        class created_at:
            @staticmethod
            def isoformat():
                return "2026-01-01T00:00:00"

    result = _run_to_dict(FakeRun())

    assert result["id"] == 1
    assert result["brand"] == "TestBrand"
    assert result["queries"] == ["q1", "q2"]
    assert result["overall_score"] == 75.5
    assert result["per_query_scores"] == [{"query": "q1", "score": 80.0}, {"query": "q2", "score": 71.0}]
    assert result["created_at"] == "2026-01-01T00:00:00"


def test_run_to_dict_empty_queries():
    """_run_to_dict should handle empty queries list."""
    class FakeRun:
        id = 2
        brand_name = "EmptyBrand"
        queries = json.dumps([])
        overall_score = 0.0
        per_query_scores = json.dumps([])

        class created_at:
            @staticmethod
            def isoformat():
                return "2026-01-02T00:00:00"

    result = _run_to_dict(FakeRun())
    assert result["queries"] == []
    assert result["per_query_scores"] == []
    assert result["overall_score"] == 0.0