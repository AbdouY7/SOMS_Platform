# analytics/algorithms/diffusion.py
"""
S-Curve Logistic Diffusion Algorithm with Stochastic Simulation.
Incorporates logic from the user's stochastic Bass/Logistic model:
y(t) = K / (1 + exp(-r * (t - t0)))
with stochastic paths, milestone projections, and curve calibration.
"""
import math
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

SCENARIO_PRESETS = {
    "massiliya": {
        "id": "massiliya",
        "label": "Diffusion Massiliya (Optimale)",
        "rate": 0.4,
        "mid": 18,
        "description": "Fast adoption curve driven by high influencer impact and viral momentum."
    },
    "equilibree": {
        "id": "equilibree",
        "label": "Diffusion Équilibrée",
        "rate": 0.2,
        "mid": 38,
        "description": "Steady balanced organic growth with progressive market penetration."
    },
    "classique": {
        "id": "classique",
        "label": "Diffusion Classique",
        "rate": 0.12,
        "mid": 65,
        "description": "Traditional slower adoption curve typical of conservative segments."
    }
}


def logistic_val(t: float, K: float, r: float, t0: float) -> float:
    """Standard 3-parameter logistic function."""
    try:
        exponent = -r * (t - t0)
        # Avoid math overflow
        if exponent > 700:
            return 0.0
        if exponent < -700:
            return float(K)
        return float(K / (1.0 + math.exp(exponent)))
    except OverflowError:
        return float(K) if (t >= t0) else 0.0


def calculate_milestone_day(p: float, r: float, t0: float) -> float:
    """
    Milestone day for fraction p of K:
    t_p = t0 + ln(p / (1 - p)) / r
    """
    if p <= 0 or p >= 1 or r <= 0:
        return float(t0)
    return round(t0 + math.log(p / (1.0 - p)) / r, 2)


def simulate_diffusion(
    target_audience: int,
    K: float,
    r: float,
    t0: float,
    duration_days: int,
    start_date: str,
    budget: Optional[float] = None,
    volatility: float = 30.0,
    n_simulations: int = 15,
    seed: Optional[int] = 42
) -> Dict[str, Any]:
    """
    Simulates cumulative and daily adoption series over duration_days,
    including stochastic variance paths, milestone days, and warnings.
    """
    # Deterministic start date parsing
    try:
        base_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        base_date = datetime.now().date()

    generations = np.arange(0, duration_days + 1)
    
    # 1. Base S-Curve
    # base_curve = K / (1 + np.exp(-r * (generations - t0)))
    base_curve = np.array([logistic_val(float(t), K, r, t0) for t in generations])

    # 2. Stochastic paths (as in user's code.py)
    rng = np.random.default_rng(seed)
    sim_paths = []
    effective_volatility = min(volatility, K * 0.15)  # Scale noise relative to capacity
    
    for _ in range(n_simulations):
        noise = rng.uniform(-effective_volatility, effective_volatility, size=len(generations))
        path = np.clip(base_curve + noise, 0, K)
        sim_paths.append(path)
    
    sim_paths_matrix = np.array(sim_paths)
    stochastic_p10 = np.percentile(sim_paths_matrix, 10, axis=0)
    stochastic_p90 = np.percentile(sim_paths_matrix, 90, axis=0)

    # 3. Build series data
    series = []
    prev_cum = 0.0
    for day in range(duration_days + 1):
        cur_date = base_date + timedelta(days=day)
        cum_val = round(float(base_curve[day]), 2)
        daily_val = round(cum_val if day == 0 else max(0.0, cum_val - prev_cum), 2)
        prev_cum = cum_val

        series.append({
            "day": day,
            "date": cur_date.isoformat(),
            "cumulative": cum_val,
            "daily": daily_val,
            "stochasticMin": round(float(stochastic_p10[day]), 2),
            "stochasticMax": round(float(stochastic_p90[day]), 2)
        })

    # 4. Milestone days
    # p10 (10%), p50 (50%), p90 (90%)
    p10_day = calculate_milestone_day(0.10, r, t0)
    p50_day = calculate_milestone_day(0.50, r, t0)  # = t0
    p90_day = calculate_milestone_day(0.90, r, t0)

    milestones = {
        "p10": {
            "day": p10_day,
            "target": round(0.10 * K, 2),
            "reached": p10_day <= duration_days and p10_day >= 0
        },
        "p50": {
            "day": p50_day,
            "target": round(0.50 * K, 2),
            "reached": p50_day <= duration_days and p50_day >= 0
        },
        "p90": {
            "day": p90_day,
            "target": round(0.90 * K, 2),
            "reached": p90_day <= duration_days and p90_day >= 0
        }
    }

    # 5. Summary metrics
    final_value = round(float(base_curve[-1]), 2)
    pct_of_K = round((final_value / K) * 100.0, 2) if K > 0 else 0.0

    cost_per_result = None
    if budget is not None and budget > 0 and final_value > 0:
        cost_per_result = round(budget / final_value, 2)

    # 6. Warnings
    warnings = []
    if final_value < (0.90 * K):
        warnings.append({
            "code": "ENDS_BEFORE_SATURATION",
            "message": "Campaign ends before reaching 90% saturation capacity."
        })
    if t0 > duration_days:
        warnings.append({
            "code": "MIDPOINT_AFTER_CAMPAIGN",
            "message": "Midpoint inflection day (t0) occurs after campaign duration."
        })
    if p90_day > duration_days:
        warnings.append({
            "code": "P90_AFTER_CAMPAIGN",
            "message": "90% adoption milestone is projected beyond campaign duration."
        })
    if K > target_audience:
        warnings.append({
            "code": "CAPACITY_EXCEEDS_AUDIENCE",
            "message": "Reachable capacity K cannot exceed target audience."
        })

    return {
        "series": series,
        "milestones": milestones,
        "summary": {
            "finalValue": final_value,
            "pctOfK": pct_of_K,
            "costPerResult": cost_per_result,
            "budget": budget,
            "durationDays": duration_days,
            "targetAudience": target_audience,
            "K": K,
            "r": r,
            "t0": t0
        },
        "presets": SCENARIO_PRESETS,
        "warnings": warnings
    }


def fit_curve_parameters(
    observed_points: List[Dict[str, float]],
    initial_K: Optional[float] = None
) -> Dict[str, Any]:
    """
    Fits logistic curve parameters (K, r, t0) to observed cumulative points
    using scipy.optimize.curve_fit.
    """
    from scipy.optimize import curve_fit

    if len(observed_points) < 3:
        raise ValueError("At least 3 observed points are required for curve fitting.")

    days = np.array([float(p["day"]) for p in observed_points])
    values = np.array([float(p["value"]) for p in observed_points])

    # Initial guess
    k_guess = initial_K if initial_K and initial_K > 0 else float(np.max(values) * 1.2)
    t0_guess = float(np.median(days))
    r_guess = 0.2

    def model_fn(t, k_param, r_param, t0_param):
        return k_param / (1.0 + np.exp(-np.clip(r_param * (t - t0_param), -50, 50)))

    bounds = (
        [np.max(values) * 0.9, 0.01, 0.0],  # lower bounds: K, r, t0
        [np.max(values) * 10.0, 3.0, np.max(days) * 3.0]  # upper bounds
    )

    try:
        popt, _ = curve_fit(
            model_fn,
            days,
            values,
            p0=[k_guess, r_guess, t0_guess],
            bounds=bounds,
            maxfev=2000
        )
        fitted_k, fitted_r, fitted_t0 = popt
        predictions = model_fn(days, fitted_k, fitted_r, fitted_t0)
        rmse = float(np.sqrt(np.mean((values - predictions) ** 2)))

        return {
            "K": round(float(fitted_k), 2),
            "r": round(float(fitted_r), 4),
            "t0": round(float(fitted_t0), 2),
            "rmse": round(rmse, 2),
            "warnings": []
        }
    except Exception as exc:
        raise ValueError(f"Curve calibration failed to converge: {str(exc)}")

