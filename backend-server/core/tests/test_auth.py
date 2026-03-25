import pytest


def test_login_success(api_client, admin_user):
    response = api_client.post(
        "/api/v1/login/", {"email": "admin@test.com", "password": "testpass123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@test.com"
    assert data["id"] == str(admin_user.id)
    assert data["is_staff"] is True


def test_login_invalid_password(api_client, admin_user):
    response = api_client.post(
        "/api/v1/login/", {"email": "admin@test.com", "password": "wrong"}
    )
    assert response.status_code == 401


def test_login_missing_fields(api_client):
    response = api_client.post("/api/v1/login/", {})
    assert response.status_code == 400


def test_logout_success(admin_client):
    response = admin_client.post("/api/v1/logout/")
    assert response.status_code == 204


def test_logout_unauthenticated(api_client):
    response = api_client.post("/api/v1/logout/")
    assert response.status_code == 403
