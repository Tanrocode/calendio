from __future__ import annotations

import os
import re
import time as _time
import logging
from contextvars import ContextVar
from datetime import datetime, timedelta, time as time_type
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

# Short-lived availability caches so the LLM never re-hits the Calendar API for
# a slot it already fetched in the same conversation.  Keyed by the query args;
# entries expire after 2 minutes so stale data can't block a real booking.
_AVAIL_CACHE:  Dict[str, Tuple[Any, float]] = {}
_EVENTS_CACHE: Dict[str, Tuple[Any, float]] = {}
_CACHE_TTL = 120  # seconds


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


def _within_business_hours(start_dt: datetime, end_dt: datetime, hours_str: str) -> Tuple[bool, str]:
    """Return (ok, reason). reason is non-empty only when ok=False."""
    if not hours_str:
        return True, ""

    appt_day   = start_dt.weekday()                        # 0 = Mon … 6 = Sun
    appt_start = start_dt.timetz().replace(tzinfo=None)
    appt_end   = end_dt.timetz().replace(tzinfo=None)

    # ── JSON format (BusinessHoursEditor stores this) ──────────────────────
    # e.g. {"Mon":{"open":"09:00","close":"17:00"}, "Tue":{...}, ...}
    stripped = hours_str.strip()
    if stripped.startswith("{"):
        try:
            import json as _json
            _day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            schedule: Dict[str, Any] = _json.loads(stripped)
            day_name = _day_names[appt_day]
            if day_name not in schedule:
                return False, f"The business is not open on {day_name}s."
            slot   = schedule[day_name]
            opens  = time_type(*[int(x) for x in slot["open"].split(":")])
            closes = time_type(*[int(x) for x in slot["close"].split(":")])
            if appt_start >= opens and appt_end <= closes:
                return True, ""
            return False, (
                f"That time is outside business hours. "
                f"On {day_name}s the business is open {slot['open']}–{slot['close']}. "
                "Please offer a time within those hours."
            )
        except Exception:
            pass  # malformed JSON — fall through to text parser

    # ── Legacy text format ("Mon-Fri 9am-5pm, Sat 10am-3pm") ──────────────
    for segment in hours_str.split(","):
        m = re.match(
            r"^([A-Za-z]+(?:\s*-\s*[A-Za-z]+)?)\s+(.+?)\s*[-–]\s*(.+)$",
            segment.strip(),
        )
        if not m:
            continue
        try:
            days   = _day_range(m.group(1))
            opens  = _parse_clock(m.group(2))
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
    def __init__(self, config: AgentCreate, call_mode: bool = False):
        self.config = config
        # call_mode=True is used during live voice calls.
        # Write tools (create/reschedule/delete) are excluded so the agent never
        # blocks the conversation waiting for a Google Calendar API write.
        # Bookings are queued verbally and processed after the call ends.
        self.call_mode = call_mode
        if call_mode:
            self.tools = [
                check_availability,
                list_calendar_events,
                find_events_by_text,
            ]
        else:
            self.tools = [
                check_availability,
                create_appointment,
                list_calendar_events,
                find_events_by_text,
                delete_calendar_event,
                reschedule_calendar_event,
            ]
        self.agent = self._build_agent()

    def _build_agent(self):
        # Keep backend booting even if optional LLM deps are missing in local/dev envs.
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY is not set — agent will return stub response.")
            return None
        try:
            from langchain.agents import AgentExecutor, create_tool_calling_agent
            from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
            from langchain_openai import ChatOpenAI
        except ImportError as exc:
            logger.error("LangChain packages missing: %s — run `pip install langchain langchain-openai`", exc)
            return None

        llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY)

        # Prompt template: system context, optional conversation history, current user turn,
        # then the scratchpad where the agent records its reasoning and tool calls.
        prompt = ChatPromptTemplate.from_messages([
            ("system", self.build_system_prompt()),
            MessagesPlaceholder("chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder("agent_scratchpad"),
        ])

        agent = create_tool_calling_agent(llm, self.tools, prompt)
        return AgentExecutor(agent=agent, tools=self.tools, verbose=True, max_iterations=6)

    @staticmethod
    def _escape(text: str) -> str:
        """Escape curly braces so LangChain doesn't treat user text as f-string variables."""
        return text.replace("{", "{{").replace("}", "}}")

    def build_system_prompt(self) -> str:
        now = datetime.now(ZoneInfo("America/Los_Angeles"))
        parts = [
            f"Today is {now.strftime('%A, %B %-d, %Y')}. Current time: {now.strftime('%-I:%M %p %Z')}.",
            f"You are an assistant for {self._escape(self.config.name)}.",
        ]
        if self.config.services:
            parts.append(f"Services offered: {self._escape(self.config.services)}.")
        if self.config.business_hours:
            parts.append(f"Business hours: {self._escape(self.config.business_hours)}.")
        if self.config.agent_instructions:
            parts.append(f"Instructions from business: {self._escape(self.config.agent_instructions)}")
        if self.config.context:
            parts.append(f"Additional business context (use this to answer questions about pricing, policies, and details):\n{self._escape(self.config.context)}")

        if self.call_mode:
            parts.append(
                "You are on a live voice call. Keep replies short and conversational — one or two sentences at most. "
                "You can check availability and look up existing appointments, but you CANNOT create, reschedule, or cancel appointments during this call. "
                "When a caller wants to book, collect the date, time, service, and their name verbally, then tell them: "
                "'Great — I've got all the details and will confirm your booking right after our call.' "
                "Do NOT attempt to book during the call. Booking is handled after the call ends. "
                "When asked about hours, services, pricing, or other business details, share what you know. "
                "Always check availability before confirming a time slot. Use ISO 8601 datetime strings in the business timezone for tool calls."
            )
        else:
            parts.append(
                "You help callers book, reschedule, or cancel appointments, and answer any questions about the business. "
                "When asked about hours, services, pricing, or any other business details, share what you know from the "
                "information above — be warm, helpful, and informative. "
                "IMPORTANT: Never book outside business hours — if a caller requests a time outside those hours, "
                "decline politely and suggest the nearest available slot within hours. "
                "Always check availability before booking. Use ISO 8601 datetime strings in the business timezone for all tool calls. "
                "To reschedule: first use list_calendar_events or find_events_by_text to locate the event id, then call "
                "reschedule_calendar_event with the id and new times. "
                "To cancel: find the event id the same way, then call delete_calendar_event."
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

            # Convert conversation history to LangChain message objects
            from langchain_core.messages import AIMessage, HumanMessage
            chat_history = []
            for m in (history or []):
                if m["role"] == "user":
                    chat_history.append(HumanMessage(content=m["content"]))
                else:
                    chat_history.append(AIMessage(content=m["content"]))

            result = self.agent.invoke({
                "input": message,
                "chat_history": chat_history,
            })
            reply = result["output"]
            return {"reply": reply}
        except Exception as exc:
            # If the failure is a revoked/expired Google OAuth token, return a
            # friendly message instead of crashing — the user just needs to
            # reconnect their calendar from the dashboard.
            try:
                from google.auth.exceptions import RefreshError
                _chain = exc
                while _chain is not None:
                    if isinstance(_chain, RefreshError):
                        logger.warning("Google OAuth token expired/revoked — user must reconnect calendar.")
                        return {
                            "reply": (
                                "I'm sorry, but my connection to Google Calendar has expired. "
                                "The business owner needs to reconnect their calendar from the dashboard. "
                                "Is there anything else I can help you with?"
                            )
                        }
                    _chain = getattr(_chain, "__cause__", None) or getattr(_chain, "__context__", None)
            except ImportError:
                pass
            logger.exception("agent.invoke failed")
            raise
        finally:
            # Always clear context so later unrelated requests never reuse stale tokens.
            _OAUTH_SESSION_CTX.reset(oauth_token_tok)
            _BUSINESS_CTX.reset(business_tok)


@tool
def check_availability(business_id: int, start_datetime: str, end_datetime: str) -> bool:
    """Check if the requested time range is free on the business's Google Calendar."""
    cache_key = f"avail|{start_datetime}|{end_datetime}"
    now = _time.monotonic()
    if cache_key in _AVAIL_CACHE:
        val, exp = _AVAIL_CACHE[cache_key]
        if now < exp:
            logger.debug("check_availability: cache hit %s–%s", start_datetime, end_datetime)
            return val

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
    is_free = len(busy) == 0
    _AVAIL_CACHE[cache_key] = (is_free, now + _CACHE_TTL)
    return is_free


def _create_appointment_impl(
    business_id: int,
    start_datetime: str,
    end_datetime: str,
    service_name: str = "Appointment",
    customer_name: str = "Client",
    description: str = "",
) -> Dict[str, Any]:
    """Core appointment creation logic shared by the @tool and post-call booking."""
    calendar_id, timezone = _get_calendar_id_and_timezone()
    start_dt = _parse_datetime_in_tz(start_datetime, timezone)
    end_dt   = _parse_datetime_in_tz(end_datetime, timezone)

    # Only enforce business hours when the context has them set.
    business_hours = (_BUSINESS_CTX.get() or {}).get("business_hours", "")
    if business_hours:
        ok, reason = _within_business_hours(start_dt, end_dt, business_hours)
        if not ok:
            return {"booked": False, "error": reason}

    creds = _get_credentials()
    gcal_service = build("calendar", "v3", credentials=creds)
    event_body = {
        "summary": service_name or "Appointment",
        "description": description or "",
        "start": {"dateTime": start_dt.isoformat(), "timeZone": timezone},
        "end":   {"dateTime": end_dt.isoformat(),   "timeZone": timezone},
    }
    created = gcal_service.events().insert(calendarId=calendar_id, body=event_body).execute()
    google_event_id = created.get("id")

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
        "end_time":   end_dt.replace(tzinfo=None).isoformat(),
        "google_event_id": google_event_id,
    }).execute()

    return {
        "google_event_id": google_event_id,
        "google_event_link": created.get("htmlLink"),
    }


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
    return _create_appointment_impl(
        business_id, start_datetime, end_datetime, service_name, customer_name, description
    )


def _list_events_impl(
    time_min: str,
    time_max: str,
    text_query: Optional[str],
    max_results: int,
) -> List[Dict[str, Any]]:
    """Shared implementation for list + search tools (one Google API call shape)."""
    cache_key = f"events|{time_min}|{time_max}|{text_query}|{max_results}"
    now = _time.monotonic()
    if cache_key in _EVENTS_CACHE:
        val, exp = _EVENTS_CACHE[cache_key]
        if now < exp:
            return val

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
    _EVENTS_CACHE[cache_key] = (out, now + _CACHE_TTL)
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
    service.events().delete(calendarId=calendar_id, eventId=event_id).execute()

    # Mirror the delete in Supabase so appointment records stay in sync
    supabase.table("appointments").delete().eq("google_event_id", event_id).execute()

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

    # Keep Supabase appointments table in sync with the rescheduled times
    supabase.table("appointments").update({
        "start_time": new_start_dt.replace(tzinfo=None).isoformat(),
        "end_time": new_end_dt.replace(tzinfo=None).isoformat(),
    }).eq("google_event_id", event_id).execute()

    return {
        "google_event_id": updated.get("id"),
        "google_event_link": updated.get("htmlLink"),
        "start": sid,
        "end": eid,
    }


def extract_and_book(
    agent_config: "AgentCreate",
    messages: List[Dict[str, str]],
    user_id: int,
    agent_id: int,
    oauth_session: Dict[str, Optional[str]],
    timezone: str = "America/Los_Angeles",
) -> Dict[str, Any]:
    """
    Called after a voice call ends.  Uses an LLM to extract booking intent from
    the full transcript, then creates the appointment in Google Calendar and
    mirrors it in Supabase.  Missing fields default to 'Client' / 'Appointment'.
    Returns {"booked": bool, ...}.
    """
    if not settings.OPENAI_API_KEY:
        return {"booked": False, "error": "OPENAI_API_KEY not set"}

    from openai import OpenAI as _OpenAI
    import json as _json

    client = _OpenAI(api_key=settings.OPENAI_API_KEY)
    transcript = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
    now = datetime.now(ZoneInfo(timezone))

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": (
                f"Extract appointment details from this call transcript.\n"
                f"Today: {now.strftime('%A, %B %-d, %Y')}. Timezone: {timezone}.\n"
                f"Services offered: {agent_config.services or 'Not specified'}.\n\n"
                "Return ONLY a JSON object with these keys:\n"
                '  "intent": "book" | "reschedule" | "cancel" | "faq" | "none"\n'
                '  "outcome": "Booked" | "Rescheduled" | "Cancelled" | "No result"\n'
                '  "service_name": string (default "Appointment")\n'
                '  "customer_name": string (default "Client")\n'
                '  "start_datetime": ISO 8601 string in the given timezone, or null\n'
                '  "end_datetime": ISO 8601 string (infer from service duration; default +1 hr), or null\n\n'
                "Rules:\n"
                '  - intent "book": caller asked to book and a date/time was agreed upon\n'
                '  - intent "reschedule": caller asked to move an existing appointment\n'
                '  - intent "cancel": caller asked to cancel an appointment\n'
                '  - intent "faq": caller only asked questions, no appointment action\n'
                '  - outcome: what the call accomplished (e.g. "Booked" even if not yet confirmed)\n'
                "  - Fill missing customer_name → 'Client', missing service → 'Appointment'\n\n"
                f"TRANSCRIPT:\n{transcript}"
            ),
        }],
        temperature=0,
        max_tokens=300,
    )

    try:
        raw = resp.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        details: Dict[str, Any] = _json.loads(raw)
    except Exception as exc:
        logger.warning("extract_and_book: JSON parse failed — %s", exc)
        return {"booked": False, "error": f"Extraction parse error: {exc}"}

    if details.get("intent") not in ("book",):
        return {"booked": False, "outcome": details.get("outcome") or "No result", "details": details}

    start_str = details.get("start_datetime")
    end_str   = details.get("end_datetime")

    if not start_str:
        return {"booked": False, "outcome": "No result", "error": "No appointment time found in transcript", "details": details}

    if not end_str:
        try:
            end_str = (_parse_datetime_in_tz(start_str, timezone) + timedelta(hours=1)).isoformat()
        except Exception:
            return {"booked": False, "outcome": "No result", "error": "Could not determine end time", "details": details}

    # Set context vars so _create_appointment_impl can access credentials.
    # Pass business_hours="" to skip hours enforcement — the agent already
    # confirmed availability verbally during the call.
    oauth_tok = _OAUTH_SESSION_CTX.set(oauth_session)
    biz_tok   = _BUSINESS_CTX.set({
        "calendar_id":   "primary",
        "timezone":      timezone,
        "business_hours": "",
        "agent_id":      str(agent_id),
    })
    try:
        result = _create_appointment_impl(
            business_id=user_id,
            start_datetime=start_str,
            end_datetime=end_str,
            service_name=details.get("service_name") or "Appointment",
            customer_name=details.get("customer_name") or "Client",
            description="",
        )
        booked = bool(result.get("google_event_id"))
        outcome = "Booked" if booked else "No result"
        return {"booked": booked, "outcome": outcome, "details": details, "event": result}
    except Exception as exc:
        logger.exception("extract_and_book: appointment creation failed")
        return {"booked": False, "outcome": "No result", "error": str(exc), "details": details}
    finally:
        _OAUTH_SESSION_CTX.reset(oauth_tok)
        _BUSINESS_CTX.reset(biz_tok)
