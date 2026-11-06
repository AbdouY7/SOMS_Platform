"""
SOMS Analytics Service — Forecast & S-Curve Simulation Blueprint (System 8)
Contract per Appendix C:
POST /compute/forecast
POST /compute/forecast/fit (optional calibration)
"""
from typing import List, Optional
from flask import Blueprint, request, jsonify
from pydantic import BaseModel, Field, field_validator
from algorithms.diffusion import simulate_diffusion, fit_curve_parameters

forecast_bp = Blueprint("forecast", __name__)


class ForecastRequest(BaseModel):
    targetAudience: int = Field(gt=0, description="Total reachable market audience")
    K: float = Field(gt=0, description="Saturation capacity ceiling")
    r: float = Field(gt=0, le=5.0, description="Adoption growth rate per day")
    t0: float = Field(ge=0, description="Midpoint day when half of capacity is reached")
    durationDays: int = Field(ge=1, le=365, description="Campaign duration in days")
    startDate: str = Field(description="Campaign start date (YYYY-MM-DD)")
    budget: Optional[float] = Field(default=None, ge=0, description="Optional campaign budget in DZD")
    volatility: Optional[float] = Field(default=30.0, ge=0, description="Stochastic noise amplitude")
    nSimulations: Optional[int] = Field(default=15, ge=1, le=50, description="Number of stochastic simulation runs")

    @field_validator("K")
    @classmethod
    def validate_capacity_vs_audience(cls, v, info):
        # targetAudience might be available in info.data
        if "targetAudience" in info.data and v > info.data["targetAudience"]:
            raise ValueError("K (capacity) cannot exceed targetAudience.")
        return v


class ObservedPoint(BaseModel):
    day: float = Field(ge=0)
    value: float = Field(ge=0)


class CurveFitRequest(BaseModel):
    observed: List[ObservedPoint] = Field(min_length=3, max_length=500)
    initialK: Optional[float] = Field(default=None, gt=0)


@forecast_bp.route("/forecast", methods=["POST"])
def compute_forecast():
    """
    Simulates cumulative and daily S-Curve growth over time, calculates milestones
    and stochastic confidence intervals.
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "VALIDATION_ERROR", "details": "Request body must be valid JSON"}), 400

    try:
        req = ForecastRequest(**body)
    except Exception as exc:
        return jsonify({"error": "VALIDATION_ERROR", "details": str(exc)}), 400

    try:
        result = simulate_diffusion(
            target_audience=req.targetAudience,
            K=req.K,
            r=req.r,
            t0=req.t0,
            duration_days=req.durationDays,
            start_date=req.startDate,
            budget=req.budget,
            volatility=req.volatility or 30.0,
            n_simulations=req.nSimulations or 15
        )
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({"error": "COMPUTATION_ERROR", "details": str(exc)}), 500


@forecast_bp.route("/forecast/fit", methods=["POST"])
def fit_curve():
    """
    Calibrates K, r, t0 against observed historical cumulative data points.
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "VALIDATION_ERROR", "details": "Request body must be valid JSON"}), 400

    try:
        req = CurveFitRequest(**body)
    except Exception as exc:
        return jsonify({"error": "VALIDATION_ERROR", "details": str(exc)}), 400

    try:
        observed_dicts = [{"day": p.day, "value": p.value} for p in req.observed]
        fitted = fit_curve_parameters(observed_dicts, req.initialK)
        return jsonify(fitted), 200
    except ValueError as exc:
        return jsonify({"error": "CALIBRATION_ERROR", "details": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": "COMPUTATION_ERROR", "details": str(exc)}), 500

