from __future__ import annotations

import os
from contextvars import ContextVar
from datetime import datetime
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

from fastapi import Request
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from langchain.agents import create_agent
from langchain.tools import tool
from langchain_openai import ChatOpenAI

from ..config import settings
from ..supabase_client import supabase
from ..routers.agent_config import AgentCreate


_OAUTH_SESSION_CTX: ContextVar[Optional[Dict[str, Optional[str]]]] = ContextVar(
    "_OAUTH_SESSION_CTX", default=None
)
_BUSINESS_CTX: ContextVar[Optional[Dict[str, Optional[str]]]] = ContextVar(
    "_BUSINESS_CTX", default=None
)


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
        self.tools = [check_availability, create_appointment]
        self.agent = create_agent(
            model=ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY),
            tools=self.tools,
            system_prompt=self.build_system_prompt(),
        )

    def build_system_prompt(self) -> str:
        parts = [f"You are an assistant for {self.config.name}."]
        if self.config.services:
            parts.append(f"Services offered: {self.config.services}.")
        if self.config.business_hours:
            parts.append(f"Business hours: {self.config.business_hours}.")
        if self.config.agent_instructions:
            parts.append(f"Instructions from business: {self.config.agent_instructions}")
        parts.append(
            "Help callers book appointments and answer questions about the business. "
            "Only book appointments for services the business offers and within business hours."
        )
        return " ".join(parts)

    def run(self, user_id: int, message: str, request: Request) -> Dict[str, Any]:
        if "token" not in request.session:
            return {"reply": "Connect your Google Calendar first, then book an appointment."}

        oauth_token_tok = _OAUTH_SESSION_CTX.set({
            "token": request.session.get("token"),
            "refresh_token": request.session.get("refresh_token"),
        })
        business_tok = _BUSINESS_CTX.set({
            "calendar_id": "primary",
            "timezone": "America/Los_Angeles",
        })

        try:
            result = self.agent.invoke({"messages": [{"role": "user", "content": message}]})
            reply = result["messages"][-1].content
            return {"reply": reply}
        finally:
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
def create_appointment(business_id: int, slots: Dict[str, Any]) -> Dict[str, Any]:
    """Create a calendar event. Expected slots keys: service, start, end, description (optional), customer_name (optional)."""
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
    google_event_id = created_event.get("id")

    supabase.table("appointments").insert({
        "user_id": business_id,
        "customer_name": slots.get("customer_name", "Client"),
        "service": slots.get("service", ""),
        "start_time": start_dt.replace(tzinfo=None).isoformat(),
        "end_time": end_dt.replace(tzinfo=None).isoformat(),
        "google_event_id": google_event_id,
    }).execute()

    return {
        "google_event_id": google_event_id,
        "google_event_link": created_event.get("htmlLink"),
    }
