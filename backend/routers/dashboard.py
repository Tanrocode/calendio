from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from ..supabase_auth import CurrentUser, get_current_user
from ..supabase_client import supabase

router = APIRouter()


@router.get("/dashboard/metrics")
def get_metrics(current_user: CurrentUser = Depends(get_current_user)):
    now = datetime.now(timezone.utc)

    # Count conversations directly from the source of truth
    all_convos = (
        supabase.table("conversations")
        .select("ended_at")
        .eq("user_id", current_user.id)
        .execute()
    )
    total_conversations = len(all_convos.data)

    today_str = now.date().isoformat()  # e.g. "2026-05-05"
    conversations_today = sum(
        1 for c in all_convos.data
        if c.get("ended_at", "").startswith(today_str)
    )

    # Appointments booked — still from metrics table (no better source yet)
    metric_result = (
        supabase.table("metrics")
        .select("total_appointments_created")
        .eq("user_id", current_user.id)
        .execute()
    )
    metric = metric_result.data[0] if metric_result.data else None

    upcoming_result = (
        supabase.table("appointments")
        .select("*")
        .eq("user_id", current_user.id)
        .gte("start_time", now.isoformat())
        .order("start_time")
        .execute()
    )

    upcoming = [
        {
            "customer_name": a["customer_name"],
            "service": a["service"],
            "start_time": a["start_time"],
            "end_time": a["end_time"],
        }
        for a in upcoming_result.data
    ]

    return {
        "metrics": {
            "total_conversations": total_conversations,
            "conversations_today": conversations_today,
            "total_appointments_created": metric["total_appointments_created"] if metric else 0,
        },
        "upcoming_appointments": upcoming,
    }


@router.get("/dashboard/recent-activity")
def get_recent_activity(
    current_user: CurrentUser = Depends(get_current_user),
    limit: int = 20,
):
    """Return the most recent conversations for the dashboard Recent Activity feed."""
    result = (
        supabase.table("conversations")
        .select("*")
        .eq("user_id", current_user.id)
        .order("ended_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"conversations": result.data}
