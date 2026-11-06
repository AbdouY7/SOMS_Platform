"""
SOMS Analytics Service — Post Scheduler Blueprint (System 7)
Contract per Appendix C:
POST /compute/scheduler
Input: {
  posts: [{ publishedAt, likes, comments, shares, views, reach, impressions }],
  metric: "engagement_rate" | "public_interactions" | "auto",
  minSamplesPerSlot: int,
  minTotalPosts: int,
  timezone: string
}
Output: {
  metricUsed,
  cells: [{ weekday, hour, postCount, value, median }],
  ranking: [{ rank, weekday, hour, median, postCount }],
  recommendations: [{ weekday, hour, confidence, reason }],
  warnings: []
}
"""
from typing import List, Optional
import statistics
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from pydantic import BaseModel, Field

scheduler_bp = Blueprint("scheduler", __name__)

WEEKDAY_NAMES_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class PostInput(BaseModel):
    publishedAt: str
    likes: Optional[int] = 0
    comments: Optional[int] = 0
    shares: Optional[int] = 0
    views: Optional[int] = 0
    reach: Optional[int] = 0
    impressions: Optional[int] = 0


class SchedulerRequest(BaseModel):
    posts: List[PostInput] = Field(default_factory=list, max_length=50000)
    metric: Optional[str] = "auto"  # 'engagement_rate', 'public_interactions', or 'auto'
    minSamplesPerSlot: Optional[int] = 5
    minTotalPosts: Optional[int] = 30
    timezone: Optional[str] = "Africa/Algiers"


def parse_datetime_to_tz(dt_str: str, tz_offset_hours: int = 1) -> Optional[datetime]:
    try:
        # Standard ISO parse
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        target_tz = timezone(timedelta(hours=tz_offset_hours))
        return dt.astimezone(target_tz)
    except Exception:
        return None


@scheduler_bp.post("/scheduler")
def compute_scheduler():
    try:
        data = request.get_json(force=True, silent=False)
        payload = SchedulerRequest(**data)
    except Exception as e:
        return jsonify({"error": "VALIDATION_ERROR", "details": str(e)}), 400

    posts = payload.posts
    min_samples_per_slot = payload.minSamplesPerSlot or 5
    min_total_posts = payload.minTotalPosts or 30

    # Auto-detect or validate metric
    requested_metric = payload.metric or "auto"
    if requested_metric not in ["engagement_rate", "public_interactions", "auto"]:
        return jsonify({"error": "VALIDATION_ERROR", "details": "Invalid metric"}), 400

    # Determine metric to use:
    # If "auto", use engagement_rate only if at least 50% of posts have impressions > 0
    posts_with_impressions = sum(1 for p in posts if (p.impressions or 0) > 0)
    has_sufficient_impressions = len(posts) > 0 and (posts_with_impressions / len(posts)) >= 0.5

    if requested_metric == "auto":
        metric_used = "engagement_rate" if has_sufficient_impressions else "public_interactions"
    else:
        metric_used = requested_metric

    warnings = []
    if metric_used == "engagement_rate" and not has_sufficient_impressions:
        warnings.append("Many posts lack impression data; engagement rate is calculated only on posts where impressions are recorded.")

    # Initialize 7x24 grid (7 days, 24 hours)
    # cells_data[(weekday, hour)] = list of metric values
    cells_data = {(w, h): [] for w in range(7) for h in range(24)}
    usable_posts_count = 0

    for p in posts:
        dt = parse_datetime_to_tz(p.publishedAt, tz_offset_hours=1)
        if not dt:
            continue

        weekday = dt.weekday()  # 0 = Monday, 6 = Sunday
        hour = dt.hour          # 0..23

        val = None
        likes = p.likes or 0
        comments = p.comments or 0
        shares = p.shares or 0
        impressions = p.impressions or 0

        if metric_used == "engagement_rate":
            if impressions > 0:
                interactions = likes + comments + shares
                val = (interactions / impressions) * 100.0
        else:
            # Fallback public interactions
            val = float(likes + comments + shares)

        if val is not None:
            cells_data[(weekday, hour)].append(val)
            usable_posts_count += 1

    # Build response cells
    cells = []
    qualifying_slots = []

    for w in range(7):
        for h in range(24):
            vals = cells_data[(w, h)]
            cnt = len(vals)
            if cnt > 0:
                med = round(statistics.median(vals), 2)
                avg = round(statistics.mean(vals), 2)
            else:
                med = 0.0
                avg = 0.0

            cell = {
                "weekday": w,
                "hour": h,
                "postCount": cnt,
                "value": avg,
                "median": med,
            }
            cells.append(cell)

            if cnt >= min_samples_per_slot:
                qualifying_slots.append({
                    "weekday": w,
                    "hour": h,
                    "median": med,
                    "postCount": cnt,
                })

    # Sort qualifying slots by median descending, tie-break by postCount
    qualifying_slots.sort(key=lambda s: (s["median"], s["postCount"]), reverse=True)

    ranking = []
    for idx, slot in enumerate(qualifying_slots):
        ranking.append({
            "rank": idx + 1,
            "weekday": slot["weekday"],
            "hour": slot["hour"],
            "median": slot["median"],
            "postCount": slot["postCount"],
        })

    # Recommendations logic per spec
    recommendations = []
    if usable_posts_count < min_total_posts:
        warnings.append(
            f"Insufficient total posts sample ({usable_posts_count}/{min_total_posts} recommended). Showing historical distribution without prescriptive recommendations."
        )
    else:
        # Take top up to 3 slots
        top_candidates = ranking[:3]
        if not top_candidates:
            warnings.append(
                f"No individual hour slot met the minimum threshold of {min_samples_per_slot} posts. Try broadening your date range."
            )
        else:
            for item in top_candidates:
                w = item["weekday"]
                h = item["hour"]
                cnt = item["postCount"]
                med = item["median"]

                if cnt >= min_samples_per_slot * 2:
                    confidence = "high"
                elif cnt >= min_samples_per_slot:
                    confidence = "medium"
                else:
                    confidence = "low"

                day_name = WEEKDAY_NAMES_EN[w]
                unit = "%" if metric_used == "engagement_rate" else " interactions"
                reason = f"High median performance ({med}{unit}) across {cnt} published posts on {day_name}s around {h:02d}:00."

                recommendations.append({
                    "weekday": w,
                    "hour": h,
                    "confidence": confidence,
                    "reason": reason,
                })

    return jsonify({
        "metricUsed": metric_used,
        "sample": {
            "totalPosts": len(posts),
            "usablePosts": usable_posts_count,
            "minRequired": min_total_posts,
            "minSamplesPerSlot": min_samples_per_slot,
        },
        "cells": cells,
        "ranking": ranking,
        "recommendations": recommendations,
        "warnings": warnings,
    })

