from __future__ import annotations

import os
from contextvars import ContextVar
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

from fastapi import Request
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from langchain_core.output_parsers import BaseOutputParser
from langchain.tools import tool

from ..supabase_client import supabase


_OAUTH_SESSION_CTX: ContextVar[Optional[Dict[str, Optional[str]]]] = ContextVar(
    "_OAUTH_SESSION_CTX", default=None
)
_BUSINESS_CTX: ContextVar[Optional[Dict[str, Optional[str]]]] = ContextVar(
    "_BUSINESS_CTX", default=None
)


def _parse_datetime_in_tz(dt_str: str, timezone: str) -> datetime:
    """
    Parse ISO datetime strings and attach timezone if naive.
    Returns an aware datetime.
    """
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
    """
    LangChain-based scheduling agent for Calendio.

    This agent is currently a lightweight intent/slot runner that calls the
    calendar tools (Google Calendar API) to check availability and create
    events.
    """

    def __init__(self):
        # TODO: Initialize LangChain LLM, tools, etc.
        pass

    def run(self, user_id: int, message: str, request: Request) -> Dict[str, Any]:
        intent = "BOOK" if "book" in message.lower() else "UNKNOWN"
        slots = (
            {"date": "2026-03-03", "time": "10:00", "service": "Consultation"}
            if intent == "BOOK"
            else {}
        )

        appointment_created = False
        appointment_google_id: Optional[str] = None

        if intent == "BOOK":
            timezone = "America/Los_Angeles"
            calendar_id = "primary"

            if "token" not in request.session:
                return {
                    "reply": "Connect your Google Calendar first, then book an appointment.",
                    "intent": intent,
                    "slots": slots,
                    "appointment_created": False,
                }

            oauth_token = request.session.get("token")
            refresh_token = request.session.get("refresh_token")

            oauth_token_token = _OAUTH_SESSION_CTX.set(
                {"token": oauth_token, "refresh_token": refresh_token}
            )
            business_token = _BUSINESS_CTX.set(
                {"calendar_id": calendar_id, "timezone": timezone}
            )
            try:
                start_naive = datetime.fromisoformat(f"{slots["date"]}T={slots["time"]}")
                start_dt = start_naive.replace(tzinfo=ZoneInfo(timezone))
                end_dt = start_dt + timedelta(hours=1)

                start_iso = start_dt.isoformat()
                end_iso = end_dt.isoformat()

                available = check_availability(user_id, start_iso, end_iso)
                if available:
                    created = create_appointment(
                        user_id,
                        {
                            "service": slots["service"],
                            "start": start_iso,
                            "end": end_iso,
                            "description": slots.get("description", ""),
                            "customer_name": slots.get("customer_name", "Client"),
                        },
                    )
                    appointment_created = True
                    appointment_google_id = created.get("google_event_id")

                    supabase.table("appointments").insert({
                        "user_id": user_id,
                        "customer_name": slots.get("customer_name", "Client"),
                        "service": slots["service"],
                        "start_time": _parse_datetime_in_tz(start_iso, timezone).replace(tzinfo=None).isoformat(),
                        "end_time": _parse_datetime_in_tz(end_iso, timezone).replace(tzinfo=None).isoformat(),
                        "google_event_id": appointment_google_id,
                    }).execute()

                reply = (
                    f"Appointment booked for {slots["service"]} on {slots["date"]} at {slots["time"]}."
                    if appointment_created
                    else "Sorry, that time isn’t available. Try a different slot."
                )
            finally:
                _OAUTH_SESSION_CTX.reset(oauth_token_token)
                _BUSINESS_CTX.reset(business_token)
        else:
            reply = "Sorry, I couldn’t understand your request."

        return {
            "reply": reply,
            "intent": intent,
            "slots": slots,
            "appointment_created": appointment_created,
            "google_event_id": appointment_google_id,
        }


class AgentOutputParser(BaseOutputParser):
    """Parses agent output to structured JSON."""

    def parse(self, text: str) -> Dict[str, Any]:
        # TODO: Implement structured output parsing
        return {}


@tool
def check_availability(business_id: int, start_datetime: str, end_datetime: str) -> bool:
    """Check if the requested time range is free on the business's Google Calendar.

    Notes:
    - OAuth credentials are read from the current FastAPI request session via context.
    """
    calendar_id, timezone = _get_calendar_id_and_timezone()
    creds = _get_credentials()

    start_dt = _parse_datetime_in_tz(start_datetime, timezone)
    end_dt = _parse_datetime_in_tz(end_datetime, timezone)

    service = build("calendar", "v3", credentials=creds)

    result = (
        service.freebusy()
        .query(
            body={
                "timeMin": start_dt.isoformat(),
                "timeMax": end_dt.isoformat(),
                "timeZone": timezone,
                "items": [{"id": calendar_id}],
            }
        )
        .execute()
    )

    calendars = result.get("calendars", {}) or {}
    cal = calendars.get(calendar_id) or (next(iter(calendars.values()), {}) if calendars else {})
    busy = cal.get("busy", []) or []
    return len(busy) == 0


@tool
def create_appointment(business_id: int, slots: Dict[str, Any]) -> Dict[str, Any]:
    """Create a calendar event for the given appointment slots.

    Notes:
    - OAuth credentials are read from the current FastAPI request session via context.
    - Expected `slots` keys: `service`, `start`, `end`, `description` (optional).
    """
    calendar_id, timezone = _get_calendar_id_and_timezone()
    creds = _get_credentials()

    start_dt = _parse_datetime_in_tz(str(slots["start"]), timezone)
    end_dt = _parse_datetime_in_tz(str(slots["end"]), timezone)

    service = build("calendar", "v3", credentials=creds)

    event = {
        "summary": slots.get("service") or "Appointment",
        "description": slots.get("description") or "",
        "start": {"dateTime": start_dt.isoformat(), "timeZone": timezone},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": timezone},
    }

    created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
    return {
        "google_event_id": created_event.get("id"),
        "google_event_link": created_event.get("htmlLink"),
    }

