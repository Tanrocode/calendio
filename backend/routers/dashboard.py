from datetime import datetime, timedelta, timezone

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


@router.get("/dashboard/agent-stats")
def get_agent_stats(current_user: CurrentUser = Depends(get_current_user)):
    """Per-agent stats for the Statistics page: calls, bookings, conversion,
    plus a 7-day calls-per-day series for a small trend chart."""
    now = datetime.now(timezone.utc)
    today_str = now.date().isoformat()
    seven_days_ago = (now - timedelta(days=6)).date()  # inclusive of today = 7 days

    agents_res = (
        supabase.table("agent_configs")
        .select("id, name, is_active, created_at")
        .eq("user_id", current_user.id)
        .execute()
    )
    convos_res = (
        supabase.table("conversations")
        .select("agent_id, ended_at, outcome")
        .eq("user_id", current_user.id)
        .execute()
    )
    appts_res = (
        supabase.table("appointments")
        .select("agent_id")
        .eq("user_id", current_user.id)
        .execute()
    )

    convo_by_agent: dict[int, list[dict]] = {}
    for c in convos_res.data:
        convo_by_agent.setdefault(c.get("agent_id"), []).append(c)

    appt_counts: dict[int, int] = {}
    for a in appts_res.data:
        aid = a.get("agent_id")
        if aid is not None:
            appt_counts[aid] = appt_counts.get(aid, 0) + 1

    # 7-day date labels (oldest → newest) for the trend series.
    date_labels = [(seven_days_ago + timedelta(days=i)).isoformat() for i in range(7)]

    agents_out = []
    for a in agents_res.data:
        aid = a["id"]
        calls = convo_by_agent.get(aid, [])
        total_calls = len(calls)
        calls_today = sum(1 for c in calls if (c.get("ended_at") or "").startswith(today_str))
        bookings = appt_counts.get(aid, 0)
        conversion = round((bookings / total_calls) * 100) if total_calls else 0

        # Build 7-day series
        by_day = {d: 0 for d in date_labels}
        for c in calls:
            ended = c.get("ended_at") or ""
            day = ended[:10]
            if day in by_day:
                by_day[day] += 1
        series = [by_day[d] for d in date_labels]

        agents_out.append({
            "agent_id": aid,
            "name": a.get("name") or f"Agent {aid}",
            "is_active": a.get("is_active", True),
            "total_calls": total_calls,
            "calls_today": calls_today,
            "appointments_booked": bookings,
            "conversion_rate": conversion,
            "calls_7d": series,
        })

    agents_out.sort(key=lambda a: a["total_calls"], reverse=True)

    total_calls_all = sum(a["total_calls"] for a in agents_out)
    total_bookings_all = sum(a["appointments_booked"] for a in agents_out)
    avg_conversion = (
        round((total_bookings_all / total_calls_all) * 100) if total_calls_all else 0
    )

    return {
        "totals": {
            "total_calls": total_calls_all,
            "total_bookings": total_bookings_all,
            "avg_conversion": avg_conversion,
            "active_agents": sum(1 for a in agents_out if a["is_active"]),
        },
        "agents": agents_out,
        "date_labels": date_labels,
    }
