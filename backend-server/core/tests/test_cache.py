import pytest
from django.core.cache import cache as django_cache


@pytest.fixture(autouse=True)
def clear_cache(db):
    django_cache.clear()
    yield
    django_cache.clear()


def test_mechanism_list_populates_cache(api_client, mechanism):
    assert django_cache.get("api:mechanisms") is None
    api_client.get("/api/v1/mechanisms/")
    assert django_cache.get("api:mechanisms") is not None


def test_cache_invalidated_on_model_save(api_client, mechanism):
    api_client.get("/api/v1/mechanisms/")
    assert django_cache.get("api:mechanisms") is not None
    mechanism.name = "Updated"
    mechanism.save()
    assert django_cache.get("api:mechanisms") is None


def test_cache_invalidated_on_model_delete(api_client, mechanism):
    api_client.get("/api/v1/mechanisms/")
    assert django_cache.get("api:mechanisms") is not None
    mechanism.delete()
    assert django_cache.get("api:mechanisms") is None


def test_graph_populates_cache(api_client, mechanism):
    assert django_cache.get("api:graph") is None
    api_client.get("/api/v1/graph/")
    assert django_cache.get("api:graph") is not None


def test_general_resource_populates_cache(api_client, general_resource):
    assert django_cache.get("api:resources:general") is None
    api_client.get("/api/v1/resources/", {"general": "true"})
    assert django_cache.get("api:resources:general") is not None
