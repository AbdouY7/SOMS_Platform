"""
SOMS Analytics Service — Opportunity Score Blueprint (System 6)
Contract per Appendix C:
POST /compute/opportunity-score
Input: { items: [{ wilayaCode, features: { demandGrowth, conversionRate, leadsVolume, cac, margin } }], weights: {...} }
Output: { results: [{ wilayaCode, score, status, featuresUsed, featuresMissing, contributions, reasons }] }
"""
from typing import Dict, List, Optional
from flask import Blueprint, request, jsonify
from pydantic import BaseModel, Field, field_validator

opportunity_bp = Blueprint("opportunity", __name__)

FEATURE_KEYS = ["demandGrowth", "conversionRate", "leadsVolume", "cac", "margin"]
DEFAULT_WEIGHTS = {
    "demandGrowth": 30.0,
    "conversionRate": 25.0,
    "leadsVolume": 20.0,
    "cac": 15.0,
    "margin": 10.0,
}


class WilayaFeatures(BaseModel):
    demandGrowth: Optional[float] = None
    conversionRate: Optional[float] = None
    leadsVolume: Optional[float] = None
    cac: Optional[float] = None
    margin: Optional[float] = None

    @field_validator("*", mode="before")
    def validate_numbers(cls, v):
        if v is None:
            return None
        val = float(v)
        # Reject NaN / Inf
        if val != val or abs(val) == float("inf"):
            raise ValueError("NaN and Infinity are not allowed")
        return val


class WilayaItem(BaseModel):
    wilayaCode: str = Field(min_length=1, max_length=10)
    features: WilayaFeatures


class OpportunityScoreRequest(BaseModel):
    items: List[WilayaItem] = Field(max_length=1000)
    weights: Optional[Dict[str, float]] = None

    @field_validator("weights")
    def validate_weights(cls, v):
        if v is not None:
            total = sum(v.values())
            if abs(total - 100.0) > 0.01:
                raise ValueError(f"Weights must sum to 100 (got {total:.2f})")
            for key, val in v.items():
                if val < 0:
                    raise ValueError(f"Weight {key} cannot be negative")
        return v


@opportunity_bp.post("/opportunity-score")
def compute_opportunity_score():
    try:
        data = request.get_json(force=True, silent=False)
        payload = OpportunityScoreRequest(**data)
    except Exception as e:
        return jsonify({"error": "VALIDATION_ERROR", "details": str(e)}), 400

    weights = payload.weights or DEFAULT_WEIGHTS
    items = payload.items

    if not items:
        return jsonify({"results": []})

    # Step 1: Collect min and max for each feature across all wilayas
    min_max = {}
    for f in FEATURE_KEYS:
        vals = [
            getattr(item.features, f)
            for item in items
            if getattr(item.features, f) is not None
        ]
        if vals:
            min_max[f] = {"min": min(vals), "max": max(vals), "count": len(vals)}
        else:
            min_max[f] = None

    results = []

    for item in items:
        code = item.wilayaCode
        feats = item.features

        features_used = []
        features_missing = []

        for f in FEATURE_KEYS:
            val = getattr(feats, f)
            if val is not None:
                features_used.append(f)
            else:
                features_missing.append(f)

        # Rule per spec:
        # Marked 'partial' only if at least 3 of 5 features exist including demandGrowth OR conversionRate;
        # otherwise score = null and reason lists the missing features.
        has_anchor = ("demandGrowth" in features_used) or ("conversionRate" in features_used)
        has_enough = len(features_used) >= 3

        if not has_anchor or not has_enough:
            status = "insufficient"
            score = None
            contributions = {}
            reasons = [
                f"Missing critical indicators: {', '.join(features_missing)}"
            ]
            results.append({
                "wilayaCode": code,
                "score": None,
                "status": status,
                "featuresUsed": features_used,
                "featuresMissing": features_missing,
                "contributions": contributions,
                "reasons": reasons,
            })
            continue

        status = "ok" if len(features_missing) == 0 else "partial"

        # Step 2: Normalize available features to 0-100
        # For CAC (cost per acquisition), lower is better -> invert!
        normalized = {}
        for f in features_used:
            val = getattr(feats, f)
            mm = min_max[f]
            if mm is None or mm["min"] == mm["max"]:
                norm = 50.0  # neutral if all wilayas identical
            else:
                ratio = (val - mm["min"]) / (mm["max"] - mm["min"])
                if f == "cac":
                    norm = (1.0 - ratio) * 100.0  # inverted: lowest CAC gets 100
                else:
                    norm = ratio * 100.0
            normalized[f] = max(0.0, min(100.0, norm))

        # Step 3: Re-normalize weights among available features
        available_weights_sum = sum(weights.get(f, 0.0) for f in features_used)
        if available_weights_sum <= 0:
            status = "insufficient"
            score = None
            contributions = {}
            reasons = ["Zero weight assigned to available features"]
        else:
            contributions = {}
            total_score = 0.0
            reasons = []

            for f in features_used:
                eff_weight = weights.get(f, 0.0) / available_weights_sum
                contrib = normalized[f] * eff_weight
                contributions[f] = round(contrib, 2)
                total_score += contrib

            score = round(total_score, 2)

            # Generate natural explainable reasons per spec
            if "demandGrowth" in normalized:
                dg_val = getattr(feats, "demandGrowth")
                if normalized["demandGrowth"] >= 70:
                    reasons.append(f"High order demand growth (+{dg_val:.1f}%)")
                elif normalized["demandGrowth"] <= 30:
                    reasons.append(f"Subdued order demand growth ({dg_val:.1f}%)")

            if "cac" in normalized:
                cac_val = getattr(feats, "cac")
                if normalized["cac"] >= 70:
                    reasons.append(f"Efficient customer acquisition cost ({cac_val:.0f} DZD)")
                elif normalized["cac"] <= 30:
                    reasons.append(f"High customer acquisition cost ({cac_val:.0f} DZD)")

            if "conversionRate" in normalized:
                cr_val = getattr(feats, "conversionRate")
                if normalized["conversionRate"] >= 70:
                    reasons.append(f"Strong regional conversion rate ({(cr_val * 100):.1f}%)")

            if "leadsVolume" in normalized:
                lv_val = getattr(feats, "leadsVolume")
                if normalized["leadsVolume"] >= 70:
                    reasons.append(f"High traffic/audience interest ({int(lv_val):,} interactions)")

            if status == "partial":
                reasons.append(f"Computed without: {', '.join(features_missing)}")

            if not reasons:
                reasons.append("Balanced multi-factor performance")

        results.append({
            "wilayaCode": code,
            "score": score,
            "status": status,
            "featuresUsed": features_used,
            "featuresMissing": features_missing,
            "contributions": contributions,
            "reasons": reasons,
        })

    # Sort results by score descending (null scores at the end)
    results.sort(
        key=lambda r: (r["score"] is not None, r["score"] if r["score"] is not None else -1),
        reverse=True
    )

    return jsonify({"results": results})

