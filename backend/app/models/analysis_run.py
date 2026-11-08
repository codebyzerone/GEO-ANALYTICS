from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime

from app.core.database import Base


class AnalysisRun(Base):
    """One persisted analysis run. Stores brand, queries, scores, and timestamp."""

    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(String, index=True, nullable=False)
    queries = Column(String, nullable=False)  # JSON-encoded list of query strings
    overall_score = Column(Float, nullable=False)
    sentiment = Column(String, nullable=True)  # aggregate sentiment across LLM responses
    per_query_scores = Column(String, nullable=False)  # JSON-encoded list of {query, score}
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
