from __future__ import annotations

import json
import os
import re
import logging
from contextvars import ContextVar
from datetime import datetime, time as time_type
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from fastapi import Request
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from langchain.tools import tool

from ..config import settings
from ..supabase_client import supabase
from ..routers.agent_config import AgentCreate


# Per-request Google OAuth tokens and calendar metadata. Set in SchedulingAgent.run
# so every @tool call in the same request sees the same creds without threading globals.
_OAUTH_SESSION_CTX: ContextVar[Optional[Dict[str, Optional[str]]]] = ContextVar(
    "_OAUTH_SESSION_CTX", default=None
)
_BUSINESS_CTX: ContextVar[Optional[Dict[str, Optional[str]]]] = ContextVar(
    "_BUSINESS_CTX", default=None
)

# Route debug logs through Uvicorn's logger so they appear in the server terminal.
logger = logging.getLogger("uvicorn.error")


_DAY_MAP = {
    "mon": 0, "monday": 0,
    "tue": 1, "tuesday": 1,
    "wed": 2, "wednesday": 2,
    "thu": 3, "thursday": 3,
    "fri": 4, "friday": 4,
    "sat": 5, "saturday": 5,
    "sun": 6, "sunday": 6,
}


def _parse_clock(s: str) -> time_type:
    s = s.strip().lower()
    m = re.match(r"^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$", s)
    if not m:
        raise ValueError(f"Cannot parse time: {s}")
    hour, minute, ampm = int(m.group(1)), int(m.group(2) or 0), m.group(3)
    if ampm == "pm" and hour != 12:
        hour += 12
    elif ampm == "am" and hour == 12:
        hour = 0
    return time_type(hour, minute)


def _day_range(s: str) -> List[int]:
    # Normalize day ranges like "Mon - Fri" -> "mon-fri"
    s = re.sub(r"\s*-\s*", "-", s.strip().lower())
    if "-" in s:
        a, b = s.split("-", 1)
        start, end = _DAY_MAP.get(a.strip()), _DAY_MAP.get(b.strip())
        if start is None or end is None:
            return list(range(7))
        # Sun(6)-Sat(5) wraps around to cover all days
        if start <= end:
            return list(range(start, end + 1))
        return list(range(start, 7)) + list(range(0, end + 1))
    day = _DAY_MAP.get(s)
    return [day] if day is not None else list(range(7))


_WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _within_business_hours(start_dt: datetime, end_dt: datetime, hours_str: str) -> Tuple[bool, str]:
    """Return (ok, reason). reason is non-empty only when ok=False."""
    if not hours_str:
        return True, ""

    # New structured JSON format: {"Mon": {"open": "09:00", "close": "17:00"}, "Sat": null, ...}
    try:
        week = json.loads(hours_str)
        if isinstance(week, dict):
            day_name = _WEEKDAY_NAMES[start_dt.weekday()]
            day_data = week.get(day_name)
            if not day_data:
                return False, f"The business is closed on {day_name}s."
            opens = time_type.fromisoformat(day_data["open"])
            closes = time_type.fromisoformat(day_data["close"])
            appt_start = start_dt.timetz().replace(tzinfo=None)
            appt_end = end_dt.timetz().replace(tzinfo=None)
            if appt_start >= opens and appt_end <= closes:
                return True, ""
            return False, (
                f"That time is outside business hours. "
                f"On {day_name}s the business is open {day_data['open']}–{day_data['close']}. "
                "Please offer a time within those hours."
            )
    except (json.JSONDecodeError, KeyError, ValueError, TypeError):
        pass

    # Legacy plain-text format: "Mon-Fri 9am-5pm, Sat 10am-4pm"
    appt_day = start_dt.weekday()
    appt_start = start_dt.timetz().replace(tzinfo=None)
    appt_end = end_dt.timetz().replace(tzinfo=None)
    for segment in hours_str.split(","):
        m = re.match(
            r"^([A-Za-z]+(?:\s*-\s*[A-Za-z]+)?)\s+(.+?)\s*[-–]\s*(.+)$",
            segment.strip(),
        )
        if not m:
            continue
        try:
            days = _day_range(m.group(1))
            opens = _parse_clock(m.group(2))
            closes = _parse_clock(m.group(3))
        except ValueError:
            continue
        if appt_day in days:
            if appt_start >= opens and appt_end <= closes:
                return True, ""
            return False, (
                f"That time is outside business hours. "
                f"On that day the business is open {m.group(2)}–{m.group(3)}. "
                "Please offer a time within those hours."
            )
    return False, f"That day is not within business hours ({hours_str})."


def _parse_datetime_in_tz(dt_str: str, timezone: str) -> datetime:
    dt = datetime.fromisoformat(dt_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo(timezone))
    return dt


def _get_calendar_id_and_timezone() -> tuple[str, str]:
    business_ctx = _BUSINESS_CTX.get()
    if not business_ctx:
        raise RuntimeError("Missing business context for calendar operations.")
    calendar_id = business_ctx.get("calendar_id") or "primary"
    timezone = business_ctx.get("timezone") or "America/Los_Angeles"
    return calendar_id, timezone


def _event_start_end_strings(ev: Dict[str, Any]) -> tuple[str, str]:
    """Human-readable start/end from a Calendar API event body."""
    # Google returns either dateTime (timed events) or date (all-day). We support both.
    start = ev.get("start") or {}
    end = ev.get("end") or {}
    s = start.get("dateTime") or start.get("date") or ""
    e = end.get("dateTime") or end.get("date") or ""
    return str(s), str(e)


def _get_credentials() -> Credentials:
    oauth_session = _OAUTH_SESSION_CTX.get()
    if not oauth_session:
        raise RuntimeError("Missing OAuth session for calendar operations.")

    token = oauth_session.get("token")
    refresh_token = oauth_session.get("refresh_token")
    if not token:
        raise RuntimeError("OAuth session missing access token.")

    return Credentials(
        token=token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    )


class SchedulingAgent:
    def __init__(self, config: AgentCreate):
        self.config = config
        # LangChain passes these callables to the LLM as "tools" it may invoke with arguments.
        self.tools = [
            check_availability,  # free/busy for a window
            create_appointment,  # insert + mirror row in Supabase
            list_calendar_events,  # optional text filter via Google's "q" param
            find_events_by_text,  # same list API, always sets a search string (e.g. phone)
            delete_calendar_event,  # by Google event id
            reschedule_calendar_event,  # patch start/end on existing id
        ]
        self.agent = self._build_agent()

    def _build_agent(self):
        # Keep backend booting even if optional LLM deps are missing in local/dev envs.
        if not settings.OPENAI_API_KEY:
            return None
        try:
            from langchain.agents import create_agent
            from langchain_openai import ChatOpenAI
        except Exception:
            return None

        return create_agent(
            model=ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY),
            tools=self.tools,
            system_prompt=self.build_system_prompt(),
        )

    def build_system_prompt(self) -> str:
        now = datetime.now(ZoneInfo("America/Los_Angeles"))
        parts = [
            f"Today is {now.strftime('%A, %B %-d, %Y')}. Current time: {now.strftime('%-I:%M %p %Z')}.",
            f"You are an assistant for {self.config.name}.",
        ]
        if self.config.services:
            parts.append(f"Services offered: {self.config.services}.")
        if self.config.business_hours:
            parts.append(f"Business hours: {self.config.business_hours}.")
        if self.config.agent_instructions:
            parts.append(f"Instructions from business: {self.config.agent_instructions}")
        parts.append(
            "Help callers book appointments and answer questions about the business. "
            "IMPORTANT: Never book outside business hours — if a caller requests a time outside those hours, "
            "decline politely and suggest the nearest available time within hours. "
            "Always check availability before booking. Use ISO 8601 datetime strings in the business timezone for all tool calls. "
            "You can list upcoming events, search events by text (e.g. phone number in the description), "
            "delete an event by its id, or reschedule by id with new start/end times."
        )
        return " ".join(parts)

    def run(
        self,
        user_id: int,
        message: str,
        request: Request,
        history: Optional[List[Dict[str, Any]]] = None,
        agent_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        if "token" not in request.session:
            return {"reply": "Connect your Google Calendar first, then book an appointment."}

        # Stash session-derived values where @tool functions can read them via ContextVar.
        oauth_token_tok = _OAUTH_SESSION_CTX.set({
            "token": request.session.get("token"),
            "refresh_token": request.session.get("refresh_token"),
        })
        business_tok = _BUSINESS_CTX.set({
            "calendar_id": "primary",
            "timezone": "America/Los_Angeles",
            "business_hours": self.config.business_hours or "",
            "agent_id": str(agent_id) if agent_id is not None else None,
        })

        try:
            if self.agent is None:
                return {
                    "reply": (
                        "I can help once LLM setup is ready. "
                        "Install `langchain-openai` and set `OPENAI_API_KEY`."
                    )
                }
            messages = [
                {"role": m["role"], "content": m["content"]}
                for m in (history or [])
            ] + [{"role": "user", "content": message}]

            result = self.agent.invoke({"messages": messages})
            for msg in result.get("messages", []) or []:
                # LangChain message objects may carry tool calls in either attribute.
                tcs = getattr(msg, "tool_calls", None)
                if not tcs:
                    tcs = getattr(msg, "additional_kwargs", {}).get("tool_calls", [])
                if tcs:
                    logger.info("tool_calls=%s", tcs)
            reply = result["messages"][-1].content
            return {"reply": reply}
        except Exception:
            logger.exception("agent.invoke failed")
            raise
        finally:
            # Always clear context so later unrelated requests never reuse stale tokens.
            _OAUTH_SESSION_CTX.reset(oauth_token_tok)
            _BUSINESS_CTX.reset(business_tok)


@tool
def check_availability(business_id: int, start_datetime: str, end_datetime: str) -> bool:
    """Check if the requested time range is free on the business's Google Calendar."""

    calendar_id, timezone = _get_calendar_id_and_timezone()
    creds = _get_credentials()

    start_dt = _parse_datetime_in_tz(start_datetime, timezone)
    end_dt = _parse_datetime_in_tz(end_datetime, timezone)

    service = build("calendar", "v3", credentials=creds)
    result = (
        service.freebusy()
        .query(body={
            "timeMin": start_dt.isoformat(),
            "timeMax": end_dt.isoformat(),
            "timeZone": timezone,
            "items": [{"id": calendar_id}],
        })
        .execute()
    )

    calendars = result.get("calendars", {}) or {}
    cal = calendars.get(calendar_id) or (next(iter(calendars.values()), {}) if calendars else {})
    busy = cal.get("busy", []) or []
    return len(busy) == 0


@tool
def create_appointment(
    business_id: int,
    start_datetime: str,
    end_datetime: str,
    service_name: str = "Appointment",
    customer_name: str = "Client",
    description: str = "",
) -> Dict[str, Any]:
    """
    Create a calendar event.
    Required: business_id, start_datetime, end_datetime (ISO 8601 in business timezone).
    Optional: service, customer_name, description.
    """

    calendar_id, timezone = _get_calendar_id_and_timezone()

    start_dt = _parse_datetime_in_tz(start_datetime, timezone)
    end_dt = _parse_datetime_in_tz(end_datetime, timezone)

    business_hours = (_BUSINESS_CTX.get() or {}).get("business_hours", "")
    ok, reason = _within_business_hours(start_dt, end_dt, business_hours)
    if not ok:
        return {"booked": False, "error": reason}

    creds = _get_credentials()
    gcal_service = build("calendar", "v3", credentials=creds)
    event = {
        "summary": service_name or "Appointment",
        "description": description or "",
        "start": {"dateTime": start_dt.isoformat(), "timeZone": timezone},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": timezone},
    }

    created_event = gcal_service.events().insert(calendarId=calendar_id, body=event).execute()
    google_event_id = created_event.get("id")

    ctx = _BUSINESS_CTX.get() or {}
    agent_id_raw = ctx.get("agent_id")
    if not agent_id_raw:
        raise RuntimeError("Missing agent_id in context for appointment insert.")

    supabase.table("appointments").insert({
        "agent_id": int(agent_id_raw),
        "user_id": business_id,
        "customer_name": customer_name or "Client",
        "service": service_name or "",
        "start_time": start_dt.replace(tzinfo=None).isoformat(),
        "end_time": end_dt.replace(tzinfo=None).isoformat(),
        "google_event_id": google_event_id,
    }).execute()

    return {
        "google_event_id": google_event_id,
        "google_event_link": created_event.get("htmlLink"),
    }


def _list_events_impl(
    time_min: str,
    time_max: str,
    text_query: Optional[str],
    max_results: int,
) -> List[Dict[str, Any]]:
    """Shared implementation for list + search tools (one Google API call shape)."""
    calendar_id, timezone = _get_calendar_id_and_timezone()
    creds = _get_credentials()
    start_dt = _parse_datetime_in_tz(time_min, timezone)
    end_dt = _parse_datetime_in_tz(time_max, timezone)

    # Cap page size so the LLM never pulls an enormous payload by mistake.
    cap = max(1, min(int(max_results), 50))
    service = build("calendar", "v3", credentials=creds)
    # Docs: https://developers.google.com/calendar/api/v3/reference/events/list
    kwargs: Dict[str, Any] = {
        "calendarId": calendar_id,
        "timeMin": start_dt.isoformat(),
        "timeMax": end_dt.isoformat(),
        # Expand recurring masters into instances so each row has one concrete start time.
        "singleEvents": True,
        # Required when using orderBy=startTime with singleEvents.
        "orderBy": "startTime",
        "maxResults": cap,
    }
    # "q" is free-text search across title, description, location, attendees, etc.
    if text_query and str(text_query).strip():
        kwargs["q"] = str(text_query).strip()

    result = service.events().list(**kwargs).execute()
    items = result.get("items") or []
    # Slim each event so tool output stays token-friendly for the model.
    out: List[Dict[str, Any]] = []
    for ev in items:
        sid, eid = _event_start_end_strings(ev)
        raw_desc = ev.get("description") or ""
        desc = raw_desc[:200]
        out.append({
            "id": ev.get("id"),
            "summary": ev.get("summary") or "(no title)",
            "start": sid,
            "end": eid,
            "html_link": ev.get("htmlLink"),
            "description_snippet": desc + ("…" if len(raw_desc) > 200 else ""),
        })
    return out


@tool
def list_calendar_events(
    business_id: int,
    time_min: str,
    time_max: str,
    text_query: Optional[str] = None,
    max_results: int = 25,
) -> List[Dict[str, Any]]:
    """List events between time_min and time_max (ISO datetimes). Optional text_query searches summary, description, location (e.g. a phone number). Returns id, summary, start, end, html_link, description_snippet."""

    # business_id reserved for future per-tenant calendar routing; tools keep a uniform signature.
    _ = business_id
    return _list_events_impl(time_min, time_max, text_query, max_results)


@tool
def find_events_by_text(
    business_id: int,
    search_text: str,
    time_min: str,
    time_max: str,
    max_results: int = 25,
) -> List[Dict[str, Any]]:
    """Find events whose fields match search_text (same as Google Calendar search: summary, description, location, etc.). Use for phone numbers or names if they appear in the event text."""

    _ = business_id
    # Same backend as list_calendar_events, but search_text is always passed as Google's "q".
    return _list_events_impl(time_min, time_max, search_text, max_results)


@tool
def delete_calendar_event(business_id: int, event_id: str) -> Dict[str, Any]:
    """Delete a calendar event by Google event id (from list_calendar_events / create_appointment)."""

    _ = business_id
    calendar_id, _tz = _get_calendar_id_and_timezone()
    creds = _get_credentials()
    service = build("calendar", "v3", credentials=creds)
    # Permanent delete in Google Calendar (does not auto-remove Supabase rows if you use them).
    service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
    return {"deleted": True, "event_id": event_id}


@tool
def reschedule_calendar_event(
    business_id: int,
    event_id: str,
    new_start: str,
    new_end: str,
) -> Dict[str, Any]:
    """Move an existing event to new_start / new_end (ISO datetimes in business timezone). Preserves title and description."""

    _ = business_id
    calendar_id, timezone = _get_calendar_id_and_timezone()
    creds = _get_credentials()
    service = build("calendar", "v3", credentials=creds)

    # Must GET full resource first: update() replaces the body you send; we only mutate times.
    ev = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
    new_start_dt = _parse_datetime_in_tz(new_start, timezone)
    new_end_dt = _parse_datetime_in_tz(new_end, timezone)

    # Timed events use dateTime + timeZone (all-day events use "date" only—we assume timed here).
    ev["start"] = {"dateTime": new_start_dt.isoformat(), "timeZone": timezone}
    ev["end"] = {"dateTime": new_end_dt.isoformat(), "timeZone": timezone}

    updated = (
        service.events()
        .update(calendarId=calendar_id, eventId=event_id, body=ev)
        .execute()
    )
    sid, eid = _event_start_end_strings(updated)
    return {
        "google_event_id": updated.get("id"),
        "google_event_link": updated.get("htmlLink"),
        "start": sid,
        "end": eid,
    }
