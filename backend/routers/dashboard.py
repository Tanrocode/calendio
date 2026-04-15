from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from ..supabase_auth import CurrentUser, get_current_user
from ..supabase_client import supabase

router = APIRouter()


@router.get("/dashboard/metrics")
def get_metrics(current_user: CurrentUser = Depends(get_current_user)):
    metric_result = (
        supabase.table("metrics")
        .select("*")
        .eq("user_id", current_user.id)
        .execute()
    )
    metric = metric_result.data[0] if metric_result.data else None

    now = datetime.now(timezone.utc).isoformat()
    upcoming_result = (
        supabase.table("appointments")
        .select("*")
        .eq("user_id", current_user.id)
        .gte("start_time", now)
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
            "total_conversations": metric["total_conversations"] if metric else 0,
            "total_appointments_created": metric["total_appointments_created"] if metric else 0,
        },
        "upcoming_appointments": upcoming,
    }
