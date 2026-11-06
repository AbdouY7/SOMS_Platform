import pytest
from app import create_app, INTERNAL_API_KEY


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_scheduler_requires_key(client):
    res = client.post("/compute/scheduler", json={"posts": []})
    assert res.status_code == 401


def test_scheduler_generates_cells_and_rankings(client):
    # Create 35 posts on Monday (2026-05-04 is a Monday) at 14:00 UTC (15:00 UTC+1)
    posts = []
    for i in range(35):
        posts.append({
            "publishedAt": f"2026-05-04T14:{i:02d}:00Z",
            "likes": 100 + i,
            "comments": 20,
            "shares": 5,
            "impressions": 1000,
        })

    payload = {
        "posts": posts,
        "metric": "engagement_rate",
        "minSamplesPerSlot": 5,
        "minTotalPosts": 30,
        "timezone": "Africa/Algiers",
    }

    res = client.post(
        "/compute/scheduler",
        json=payload,
        headers={"X-Internal-Key": INTERNAL_API_KEY},
    )
    assert res.status_code == 200
    data = res.get_json()

    assert data["metricUsed"] == "engagement_rate"
    assert len(data["cells"]) == 7 * 24  # 168 cells
    assert len(data["ranking"]) >= 1

    top = data["ranking"][0]
    assert top["weekday"] == 0  # Monday
    assert top["hour"] == 15    # 14:00 UTC = 15:00 Africa/Algiers
    assert top["postCount"] == 35

    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["confidence"] == "high"


def test_scheduler_insufficient_sample_warning(client):
    # Only 5 posts total (< minTotalPosts of 30)
    posts = [
        {"publishedAt": f"2026-05-04T10:00:00Z", "likes": 50, "comments": 5, "impressions": 500}
        for _ in range(5)
    ]

    payload = {
        "posts": posts,
        "minTotalPosts": 30,
    }

    res = client.post(
        "/compute/scheduler",
        json=payload,
        headers={"X-Internal-Key": INTERNAL_API_KEY},
    )
    assert res.status_code == 200
    data = res.get_json()

    assert len(data["recommendations"]) == 0
    assert any("Insufficient total posts sample" in w for w in data["warnings"])

