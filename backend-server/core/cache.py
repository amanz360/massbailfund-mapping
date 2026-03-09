from django.core.cache import cache

CACHE_KEYS = [
    "api:mechanisms",
    "api:decision-makers",
    "api:institutions",
    "api:glossary",
    "api:resources:general",
    "api:graph",
]


def invalidate_api_caches():
    """Clear all cached API responses. Called when any model changes."""
    cache.delete_many(CACHE_KEYS)
