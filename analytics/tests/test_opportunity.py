import os
import pytest
from app import create_app, INTERNAL_API_KEY


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_opportunity_score_requires_key(client):
    res = client.post("/compute/opportunity-score", json={"items": []})
    assert res.status_code == 401


def test_opportunity_score_valid_computation(client):
    payload = {
        "items": [
            {
                "wilayaCode": "16",
                "features": {
                    "demandGrowth": 50.0,
                    "conversionRate": 0.10,
                    "leadsVolume": 1000.0,
                    "cac": 100.0,
                    "margin": 0.30,
                },
            },
            {
                "wilayaCode": "31",
                "features": {
                    "demandGrowth": 10.0,
                    "conversionRate": 0.02,
                    "leadsVolume": 200.0,
                    "cac": 500.0,
                    "margin": 0.10,
                },
            },
        ],
        "weights": {
            "demandGrowth": 30.0,
            "conversionRate": 25.0,
            "leadsVolume": 20.0,
            "cac": 15.0,
            "margin": 10.0,
        },
    }

    res = client.post(
        "/compute/opportunity-score",
        json=payload,
        headers={"X-Internal-Key": INTERNAL_API_KEY},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert "results" in data
    assert len(data["results"]) == 2

    # Wilaya 16 has higher demandGrowth, higher conversionRate, higher leads, lower CAC (inverted -> 100)
    top = data["results"][0]
    assert top["wilayaCode"] == "16"
    assert top["status"] == "ok"
    assert top["score"] == 100.0
    assert len(top["featuresUsed"]) == 5
    assert len(top["featuresMissing"]) == 0

    bottom = data["results"][1]
    assert bottom["wilayaCode"] == "31"
    assert bottom["status"] == "ok"
    assert bottom["score"] == 0.0


def test_opportunity_score_partial_and_insufficient(client):
    payload = {
        "items": [
            {
                # 3 features including conversionRate -> partial
                "wilayaCode": "25",
                "features": {
                    "conversionRate": 0.05,
                    "leadsVolume": 500.0,
                    "cac": 200.0,
                },
            },
            {
                # Only 2 features -> insufficient (score is None)
                "wilayaCode": "09",
                "features": {
                    "demandGrowth": 20.0,
                    "margin": 0.15,
                },
            },
            {
                # 3 features but neither demandGrowth nor conversionRate -> insufficient
                "wilayaCode": "19",
                "features": {
                    "leadsVolume": 400.0,
                    "cac": 250.0,
                    "margin": 0.20,
                },
            },
        ]
    }

    res = client.post(
        "/compute/opportunity-score",
        json=payload,
        headers={"X-Internal-Key": INTERNAL_API_KEY},
    )
    assert res.status_code == 200
    data = res.get_json()

    results_map = {r["wilayaCode"]: r for r in data["results"]}

    w25 = results_map["25"]
    assert w25["status"] == "partial"
    assert w25["score"] is not None
    assert "demandGrowth" in w25["featuresMissing"]

    w09 = results_map["09"]
    assert w09["status"] == "insufficient"
    assert w09["score"] is None

    w19 = results_map["19"]
    assert w19["status"] == "insufficient"
    assert w19["score"] is None


def test_opportunity_score_rejects_bad_weights(client):
    payload = {
        "items": [{"wilayaCode": "16", "features": {"demandGrowth": 10.0}}],
        "weights": {"demandGrowth": 50.0},  # sum is 50, not 100
    }
    res = client.post(
        "/compute/opportunity-score",
        json=payload,
        headers={"X-Internal-Key": INTERNAL_API_KEY},
    )
    assert res.status_code == 400
    assert "VALIDATION_ERROR" in res.get_json()["error"]
