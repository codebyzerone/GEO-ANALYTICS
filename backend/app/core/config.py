import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application configuration from environment variables (via python-dotenv)."""

    def __init__(self):
        self.APP_NAME = os.getenv("APP_NAME", "GEO Analytics API")
        self.APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
        # CORS allowlist (comma-separated origins). Defaults to localhost for dev.
        self.CORS_ALLOW_ORIGINS = os.getenv(
            "CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        )
        # Cache TTL in seconds. Default 10 minutes.
        self.CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "600"))
        # SQLite database path for history persistence.
        self.DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./geo_analytics.db")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

