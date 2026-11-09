import hashlib
import json
import time
from typing import Optional

from app.core.config import settings


def _make_cache_key(brand_name: str, queries: list, model_identifiers: list) -> str:
    """Create a cache key from brand, queries, and model identifiers."""
    canonical = {
        "brand": brand_name,
        "queries": sorted(queries) if queries else [],
        "models": sorted(model_identifiers) if model_identifiers else [],
    }
    raw = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


def _cache_get(key: str) -> Optional[dict]:
    """Get a cached value if it exists and hasn't expired."""
    cache_path = settings.DATABASE_URL.replace("sqlite:///", "./.cache.json") if "sqlite" in settings.DATABASE_URL else "./.cache.json"
    try:
        with open(cache_path, "r") as f:
            cache = json.load(f)
        entry = cache.get(key)
        if entry is None:
            return None
        expires = entry.get("expires", 0)
        if time.time() > expires:
            # Remove expired entry
            cache = {k: v for k, v in cache.items() if k != key}
            with open(cache_path, "w") as f:
                json.dump(cache, f)
            return None
        return entry.get("value")
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        return None


def _cache_set(key: str, value: dict, ttl: int) -> None:
    """Set a cached value with TTL (seconds)."""
    # File-based cache as fallback; replace with Redis in production
    cache_path = settings.DATABASE_URL.replace("sqlite:///", "./.cache.json") if "sqlite" in settings.DATABASE_URL else "./.cache.json"
    try:
        cache = {}
        try:
            with open(cache_path, "r") as f:
                cache = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            cache = {}
        cache[key] = {"value": value, "expires": time.time() + ttl}
        with open(cache_path, "w") as f:
            json.dump(cache, f)
        # Clean expired entries
        now = time.time()
        cache = {k: v for k, v in cache.items() if v["expires"] > now}
        with open(cache_path, "w") as f:
            json.dump(cache, f)
    except Exception:
        pass  # Cache failures should not break the API