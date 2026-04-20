"""
HTTP demo for Google Calendar operations that mirror the LangChain tools in
`scheduling_agent.py`. Uses the same OAuth session cookie as `/auth/url` + `/oauth/callback`.

Flow: user must be logged into the app (Supabase) and then connect Google from this page;
requests here send `Cookie` via `credentials: 'include'` through the Vite proxy.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Request
from googleapiclient.discovery import build
from pydantic import BaseModel, Field

from ..agents import scheduling_agent as sa
from .auth import _build_credentials

router = APIRouter(prefix="/calendar-demo", tags=["calendar-demo"])

# Same defaults as `SchedulingAgent.run` until you load per-user settings from DB.
_DEFAULT_CAL = "primary"
_DEFAULT_TZ = "America/Los_Angeles"


@contextmanager
def _google_tool_context(request: Request):
    """
    LangChain tools read Google tokens from ContextVars (not from Request directly).
    This block mirrors `SchedulingAgent.run`: set vars for the duration of one HTTP handler.
    """
    if "token" not in request.session:
        raise HTTPException(
            status_code=401,
            detail="No Google Calendar session. Use “Connect Google Calendar” first.",
        )
    oauth_tok = sa._OAUTH_SESSION_CTX.set(
        {
            "token": request.session.get("token"),
            "refresh_token": request.session.get("refresh_token"),
        }
    )
    biz_tok = sa._BUSINESS_CTX.set(
        {"calendar_id": _DEFAULT_CAL, "timezone": _DEFAULT_TZ}
    )
    try:
        yield
    finally:
        sa._OAUTH_SESSION_CTX.reset(oauth_tok)
        sa._BUSINESS_CTX.reset(biz_tok)


@router.get("/status")
def calendar_status(request: Request) -> Dict[str, Any]:
    """Whether the browser session has Google OAuth tokens (after successful connect)."""
    return {"connected": "token" in request.session}


@router.get("/events")
def demo_list_events(
    request: Request,
    time_min: str = Query(..., description="ISO datetime start of window"),
    time_max: str = Query(..., description="ISO datetime end of window"),
    q: Optional[str] = Query(None, description="Free-text filter (phone, name, etc.)"),
    max_results: int = Query(25, ge=1, le=50),
) -> List[Dict[str, Any]]:
    """List events in a time range; optional `q` matches Google Calendar search behavior."""
    with _google_tool_context(request):
        return sa._list_events_impl(time_min, time_max, q, max_results)


@router.delete("/events/{event_id}")
def demo_delete_event(request: Request, event_id: str) -> Dict[str, Any]:
    """Delete one event by Google event id (from list response). Mirrors `delete_calendar_event` tool."""
    if "token" not in request.session:
        raise HTTPException(status_code=401, detail="Connect Google Calendar first.")
    creds = _build_credentials(request)
    service = build("calendar", "v3", credentials=creds)
    service.events().delete(calendarId=_DEFAULT_CAL, eventId=event_id).execute()
    return {"deleted": True, "event_id": event_id}


class RescheduleBody(BaseModel):
    new_start: str = Field(..., description="ISO datetime")
    new_end: str = Field(..., description="ISO datetime")


@router.patch("/events/{event_id}")
def demo_reschedule_event(
    request: Request, event_id: str, body: RescheduleBody
) -> Dict[str, Any]:
    """Move an event to new start/end; mirrors `reschedule_calendar_event` tool (GET + UPDATE)."""
    if "token" not in request.session:
        raise HTTPException(status_code=401, detail="Connect Google Calendar first.")
    creds = _build_credentials(request)
    service = build("calendar", "v3", credentials=creds)
    ev = service.events().get(calendarId=_DEFAULT_CAL, eventId=event_id).execute()
    new_start_dt = sa._parse_datetime_in_tz(body.new_start, _DEFAULT_TZ)
    new_end_dt = sa._parse_datetime_in_tz(body.new_end, _DEFAULT_TZ)
    ev["start"] = {"dateTime": new_start_dt.isoformat(), "timeZone": _DEFAULT_TZ}
    ev["end"] = {"dateTime": new_end_dt.isoformat(), "timeZone": _DEFAULT_TZ}
    updated = service.events().update(calendarId=_DEFAULT_CAL, eventId=event_id, body=ev).execute()
    sid, eid = sa._event_start_end_strings(updated)
    return {
        "google_event_id": updated.get("id"),
        "google_event_link": updated.get("htmlLink"),
        "start": sid,
        "end": eid,
    }


@router.get("/freebusy")
def demo_freebusy(
    request: Request,
    start: str = Query(..., description="ISO datetime range start"),
    end: str = Query(..., description="ISO datetime range end"),
) -> Dict[str, Any]:
    """Returns whether the entire window is free (true) or something overlaps (false)."""
    with _google_tool_context(request):
        free = sa.check_availability.invoke(
            {"business_id": 0, "start_datetime": start, "end_datetime": end}
        )
    return {"free": bool(free)}


class CreateDemoEventBody(BaseModel):
    """Create only on Google Calendar (no Supabase row) so demos do not clutter CRM data."""

    title: str = "Calendio demo event"
    description: str = ""
    start: str
    end: str


@router.post("/events")
def demo_create_event(request: Request, body: CreateDemoEventBody) -> Dict[str, Any]:
    if "token" not in request.session:
        raise HTTPException(status_code=401, detail="Connect Google Calendar first.")
    creds = _build_credentials(request)
    service = build("calendar", "v3", credentials=creds)
    start_dt = sa._parse_datetime_in_tz(body.start, _DEFAULT_TZ)
    end_dt = sa._parse_datetime_in_tz(body.end, _DEFAULT_TZ)
    event = {
        "summary": body.title,
        "description": body.description,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": _DEFAULT_TZ},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": _DEFAULT_TZ},
    }
    created = service.events().insert(calendarId=_DEFAULT_CAL, body=event).execute()
    return {
        "id": created.get("id"),
        "html_link": created.get("htmlLink"),
        "summary": created.get("summary"),
    }
