import pytest


# ── Public read access ──────────────────────────────────────────────────


@pytest.mark.parametrize("url", [
    "/api/v1/mechanisms/",
    "/api/v1/decision-makers/",
    "/api/v1/institutions/",
    "/api/v1/mechanism-roles/",
    "/api/v1/references/",
    "/api/v1/aliases/",
    "/api/v1/memberships/",
    "/api/v1/resources/",
    "/api/v1/glossary/",
])
def test_list_is_public(api_client, url, mechanism, decision_maker, institution,
                        mechanism_role, mechanism_reference, decision_maker_alias,
                        institution_membership, resource, glossary_term):
    response = api_client.get(url)
    assert response.status_code == 200


def test_mechanism_retrieve_is_public(api_client, mechanism):
    response = api_client.get(f"/api/v1/mechanisms/{mechanism.id}/")
    assert response.status_code == 200


def test_decision_maker_retrieve_is_public(api_client, decision_maker):
    response = api_client.get(f"/api/v1/decision-makers/{decision_maker.id}/")
    assert response.status_code == 200


def test_institution_retrieve_is_public(api_client, institution):
    response = api_client.get(f"/api/v1/institutions/{institution.id}/")
    assert response.status_code == 200


def test_graph_is_public(api_client, mechanism, decision_maker, mechanism_role):
    response = api_client.get("/api/v1/graph/")
    assert response.status_code == 200


# ── Response shapes ─────────────────────────────────────────────────────


def test_mechanism_detail_shape(api_client, mechanism, mechanism_reference,
                                mechanism_role, glossary_term):
    response = api_client.get(f"/api/v1/mechanisms/{mechanism.id}/")
    data = response.json()
    assert data["id"] == str(mechanism.id)
    assert data["name"] == mechanism.name
    for key in ("references", "quotes", "timeline_entries", "resources", "roles", "glossary_terms"):
        assert key in data
    assert len(data["references"]) == 1
    assert len(data["roles"]) == 1
    assert len(data["glossary_terms"]) == 1


def test_decision_maker_detail_shape(api_client, decision_maker, mechanism_role,
                                      institution_membership, decision_maker_alias):
    response = api_client.get(f"/api/v1/decision-makers/{decision_maker.id}/")
    data = response.json()
    assert data["id"] == str(decision_maker.id)
    for key in ("mechanism_roles", "institution_memberships", "aliases_as_source", "aliases_as_target"):
        assert key in data
    assert len(data["mechanism_roles"]) == 1
    assert len(data["institution_memberships"]) == 1
    assert len(data["aliases_as_source"]) == 1


def test_institution_detail_shape(api_client, institution, institution_membership):
    response = api_client.get(f"/api/v1/institutions/{institution.id}/")
    data = response.json()
    assert data["id"] == str(institution.id)
    assert "members" in data
    assert len(data["members"]) == 1


def test_graph_response_shape(api_client, mechanism, decision_maker, institution,
                               mechanism_role, institution_membership):
    response = api_client.get("/api/v1/graph/")
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert "memberships" in data

    node_types = {n["primary_type"] for n in data["nodes"]}
    assert node_types == {"Mechanism", "Decision Maker", "Institution"}

    mech_node = next(n for n in data["nodes"] if n["primary_type"] == "Mechanism")
    for key in ("id", "name", "primary_type", "secondary_type", "description"):
        assert key in mech_node

    assert len(data["edges"]) == 1
    assert data["edges"][0]["source"] == str(mechanism.id)
    assert data["edges"][0]["target"] == str(decision_maker.id)

    assert len(data["memberships"]) == 1
    assert data["memberships"][0]["institution"] == str(institution.id)
    assert data["memberships"][0]["member"] == str(decision_maker.id)


# ── Permission enforcement ──────────────────────────────────────────────


@pytest.mark.parametrize("url,data", [
    ("/api/v1/mechanisms/", {"name": "New", "subcategory": "X", "description": "X"}),
    ("/api/v1/decision-makers/", {"name": "New", "authority_type": "X", "description": "X"}),
    ("/api/v1/institutions/", {"name": "New", "description": "X"}),
    ("/api/v1/glossary/", {"term": "New", "definition": "X"}),
])
def test_create_requires_admin(api_client, url, data):
    response = api_client.post(url, data)
    assert response.status_code == 403


def test_update_requires_admin(api_client, mechanism):
    response = api_client.patch(
        f"/api/v1/mechanisms/{mechanism.id}/", {"name": "Updated"}
    )
    assert response.status_code == 403


def test_delete_requires_admin(api_client, mechanism):
    response = api_client.delete(f"/api/v1/mechanisms/{mechanism.id}/")
    assert response.status_code == 403


# ── Admin write access ──────────────────────────────────────────────────


def test_admin_can_create_mechanism(admin_client):
    response = admin_client.post(
        "/api/v1/mechanisms/",
        {"name": "New Mechanism", "subcategory": "Test", "description": "Desc"},
    )
    assert response.status_code == 201
    assert response.json()["name"] == "New Mechanism"


def test_admin_can_update_mechanism(admin_client, mechanism):
    response = admin_client.patch(
        f"/api/v1/mechanisms/{mechanism.id}/", {"name": "Updated"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated"


def test_admin_can_delete_mechanism(admin_client, mechanism):
    response = admin_client.delete(f"/api/v1/mechanisms/{mechanism.id}/")
    assert response.status_code == 204


# ── Filtering and search ───────────────────────────────────────────────


def test_resource_general_filter(api_client, resource, general_resource):
    response = api_client.get("/api/v1/resources/", {"general": "true"})
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "General Resource"


def test_mechanism_filter_by_subcategory(api_client, mechanism):
    response = api_client.get(
        "/api/v1/mechanisms/", {"subcategory": mechanism.subcategory}
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_mechanism_search(api_client, mechanism):
    response = api_client.get("/api/v1/mechanisms/", {"search": "Test Mech"})
    assert response.status_code == 200
    assert len(response.json()) >= 1
