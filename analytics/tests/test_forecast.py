import math
import pytest
from app import create_app, INTERNAL_API_KEY


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_forecast_requires_key(client):
    res = client.post("/compute/forecast", json={})
    assert res.status_code == 401


def test_forecast_validation_rejects_invalid_inputs(client):
    headers = {"X-Internal-Key": INTERNAL_API_KEY}

    # K > targetAudience
    res = client.post(
        "/compute/forecast",
        json={
            "targetAudience": 1000,
            "K": 2000,
            "r": 0.2,
            "t0": 10,
            "durationDays": 30,
            "startDate": "2026-06-01"
        },
        headers=headers
    )
    assert res.status_code == 400

    # Negative r
    res = client.post(
        "/compute/forecast",
        json={
            "targetAudience": 10000,
            "K": 5000,
            "r": -0.1,
            "t0": 10,
            "durationDays": 30,
            "startDate": "2026-06-01"
        },
        headers=headers
    )
    assert res.status_code == 400

    # Zero duration
    res = client.post(
        "/compute/forecast",
        json={
            "targetAudience": 10000,
            "K": 5000,
            "r": 0.2,
            "t0": 10,
            "durationDays": 0,
            "startDate": "2026-06-01"
        },
        headers=headers
    )
    assert res.status_code == 400


def test_forecast_mathematical_properties(client):
    headers = {"X-Internal-Key": INTERNAL_API_KEY}
    payload = {
        "targetAudience": 50000,
        "K": 20000,
        "r": 0.25,
        "t0": 15,
        "durationDays": 30,
        "startDate": "2026-06-01",
        "budget": 100000
    }

    res = client.post("/compute/forecast", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.get_json()

    # Check series length = 31 (0..30 inclusive)
    assert len(data["series"]) == 31
    assert data["series"][0]["day"] == 0
    assert data["series"][30]["day"] == 30

    # Check value at t = t0 (day 15): y(15) must equal K / 2 = 10000
    day15 = data["series"][15]
    assert abs(day15["cumulative"] - 10000) <= 50  # within 0.5% due to rounding

    # Check milestone calculations:
    # t_p = t0 + ln(p / (1 - p)) / r
    # p10 = 15 + ln(0.1/0.9) / 0.25 = 15 + (-2.1972) / 0.25 = 15 - 8.7889 = 6.21
    # p50 = 15
    # p90 = 15 + ln(0.9/0.1) / 0.25 = 15 + 2.1972 / 0.25 = 23.79
    milestones = data["milestones"]
    assert milestones["p50"]["day"] == 15.0
    assert abs(milestones["p10"]["day"] - 6.21) < 0.1
    assert abs(milestones["p90"]["day"] - 23.79) < 0.1
    assert milestones["p10"]["reached"] is True
    assert milestones["p50"]["reached"] is True
    assert milestones["p90"]["reached"] is True

    # Check summary
    summary = data["summary"]
    assert summary["K"] == 20000
    assert summary["finalValue"] > 19000  # reaches near saturation at day 30
    assert summary["costPerResult"] is not None
    assert summary["costPerResult"] > 0
    expected_cpr = round(100000 / summary["finalValue"], 2)
    assert summary["costPerResult"] == expected_cpr


def test_forecast_curve_fitting(client):
    headers = {"X-Internal-Key": INTERNAL_API_KEY}
    
    # Generate points along y = 1000 / (1 + exp(-0.3 * (t - 10)))
    observed = []
    for day in [2, 5, 8, 10, 12, 15, 18, 22]:
        val = 1000.0 / (1.0 + math.exp(-0.3 * (day - 10)))
        observed.append({"day": float(day), "value": round(val, 1)})

    res = client.post(
        "/compute/forecast/fit",
        json={"observed": observed, "initialK": 1000},
        headers=headers
    )
    assert res.status_code == 200
    fit_data = res.get_json()

    assert abs(fit_data["K"] - 1000) < 50
    assert abs(fit_data["r"] - 0.3) < 0.05
    assert abs(fit_data["t0"] - 10) < 0.5
    assert fit_data["rmse"] < 5.0

