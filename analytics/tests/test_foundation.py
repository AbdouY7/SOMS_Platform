# Flask test — System 0: health endpoint and internal key enforcement
import pytest
import os

# Set env before importing app
os.environ.setdefault("INTERNAL_API_KEY", "test_key_that_is_long_enough_32chars")


@pytest.fixture
def client():
    from app import create_app
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_health_no_key_required(client):
    """GET /health should return 200 without any key."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_internal_key_enforced_on_other_routes(client):
    """Any non-health route without the key must return 401."""
    res = client.post("/compute/forecast", json={})
    # 401 before reaching the route (which doesn't exist yet — 404 would mean key was accepted)
    assert res.status_code == 401


def test_wrong_key_rejected(client):
    """Wrong key must return 401."""
    res = client.post(
        "/compute/forecast",
        json={},
        headers={"X-Internal-Key": "wrong_key"},
    )
    assert res.status_code == 401


def test_correct_key_passes_to_route(client):
    """Correct key should pass the guard (404 since /compute/forecast not yet registered)."""
    res = client.post(
        "/compute/forecast",
        json={},
        headers={"X-Internal-Key": "test_key_that_is_long_enough_32chars"},
    )
    # Guard passed; route not registered yet -> 404
    assert res.status_code == 404
