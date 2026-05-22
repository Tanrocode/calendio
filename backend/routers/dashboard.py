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

    # Count appointments directly from the appointments table — the metrics table
    # was under-incremented in previous versions so this is more reliable.
    all_appts = (
        supabase.table("appointments")
        .select("customer_name, service, start_time, end_time")
        .eq("user_id", current_user.id)
        .execute()
    )
    total_appointments_created = len(all_appts.data)

    # Upcoming appointments for Today's Schedule (start_time in the future)
    upcoming = [
        {
            "customer_name": a["customer_name"],
            "service": a["service"],
            "start_time": a["start_time"],
            "end_time": a["end_time"],
        }
        for a in all_appts.data
        if (a.get("start_time") or "") >= now.date().isoformat()
    ]
    upcoming.sort(key=lambda a: a["start_time"])

    return {
        "metrics": {
            "total_conversations": total_conversations,
            "conversations_today": conversations_today,
            "total_appointments_created": total_appointments_created,
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
