"""
AgentPhone webhook integration.

AgentPhone POSTs `event: "agent.message"` payloads here for both voice and SMS.
We match `data.to` (the AgentPhone number that was dialed) to a row in
`agent_configs.agentphone_number`, load that user's stored Google Calendar
tokens from the `users` table, run the existing SchedulingAgent, and stream
the response back as NDJSON (voice) or plain JSON (SMS).
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

from ..config import settings
from ..supabase_client import supabase

router = APIRouter(prefix="/webhooks", tags=["agentphone"])
logger = logging.getLogger("uvicorn.error")


def _verify_signature(raw_body: bytes, signature_header: Optional[str], timestamp: Optional[str]) -> bool:
    """HMAC-SHA256 verification of AgentPhone webhooks. Header format: 'sha256=<hex>'.

    AgentPhone actually signs over `{X-Webhook-Timestamp}.{body}` (Svix-style),
    NOT just the body as their public docs suggest. We accept either scheme so
    the integration keeps working if they change/fix it later.
    """
    secret = settings.AGENTPHONE_WEBHOOK_SECRET
    if not secret:
        logger.warning("AGENTPHONE_WEBHOOK_SECRET not set — skipping signature verification.")
        return True
    if not signature_header:
        return False

    candidates = [raw_body]
    if timestamp:
        candidates.append(f"{timestamp}.".encode() + raw_body)

    for payload in candidates:
        expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        if hmac.compare_digest(f"sha256={expected}", signature_header):
            return True
    return False


def _normalize_history(recent_history: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """AgentPhone sends history as [{content, direction, channel, at}, ...].
    SchedulingAgent expects [{role: 'user'|'assistant', content: '...'}, ...]."""
    out: List[Dict[str, str]] = []
    for h in recent_history or []:
        role = "user" if h.get("direction") == "inbound" else "assistant"
        out.append({"role": role, "content": str(h.get("content") or "")})
    return out


def _lookup_agent_by_number(to_number: str) -> Optional[Dict[str, Any]]:
    """Find the Calendio agent whose `agentphone_number` matches the dialed number.

    Since the user shares a single AgentPhone number across all agents, multiple rows
    could match. We deterministically pick the most-recently-created one and warn
    if more than one matches, so duplicates don't silently route to a stale agent.
    """
    if not to_number:
        return None
    try:
        result = (
            supabase.table("agent_configs")
            .select("*")
            .eq("agentphone_number", to_number)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        # Most commonly: the agentphone_number column hasn't been added yet.
        # Don't crash the webhook — surface a friendly hangup instead.
        logger.error(
            "AgentPhone agent lookup failed: %s. "
            "Did you run the agent_configs.agentphone_number migration?",
            exc,
        )
        return None
    rows = result.data or []
    if len(rows) > 1:
        ids = [r.get("id") for r in rows]
        logger.warning(
            "AgentPhone: %d agents matched %s (ids=%s) — using most recent (%s). "
            "Clear the AgentPhone number on the others to silence this warning.",
            len(rows), to_number, ids, rows[0].get("id"),
        )
    return rows[0] if rows else None


def _load_google_tokens(user_id: str) -> Optional[Dict[str, Optional[str]]]:
    """Pull the user's stored Google Calendar tokens from the `users` table.

    Returns None when the user hasn't connected Calendar OR when the
    google_access_token / google_refresh_token columns don't exist in Supabase yet.
    Either way, the agent will reply with a 'connect calendar' message instead of crashing.
    """
    try:
        row = (
            supabase.table("users")
            .select("google_access_token, google_refresh_token")
            .eq("id", user_id)
            .execute()
        )
    except Exception as exc:
        logger.error(
            "AgentPhone: cannot read users.google_*_token (%s). "
            "Run: ALTER TABLE users ADD COLUMN google_access_token TEXT, "
            "ADD COLUMN google_refresh_token TEXT; then reconnect Calendar so OAuth persists.",
            exc,
        )
        return None
    if not row.data or not row.data[0].get("google_refresh_token"):
        return None
    return {
        "token": row.data[0].get("google_access_token") or "",
        "refresh_token": row.data[0]["google_refresh_token"],
    }


def _run_agent(agent_config_row: Dict[str, Any], message: str, history: List[Dict[str, str]],
               oauth_session: Optional[Dict[str, Optional[str]]], call_mode: bool) -> str:
    """Build a SchedulingAgent and return its reply text (sync — wrap in to_thread)."""
    from ..agents.scheduling_agent import SchedulingAgent
    from .agent_config import AgentCreate

    agent = SchedulingAgent(
        AgentCreate(
            name=agent_config_row["name"],
            services=agent_config_row.get("services"),
            business_hours=agent_config_row.get("business_hours"),
            agent_instructions=agent_config_row.get("agent_instructions"),
            context=agent_config_row.get("context"),
        ),
        call_mode=call_mode,
    )
    result = agent.run(
        user_id=agent_config_row["user_id"],
        message=message,
        history=history,
        agent_id=agent_config_row["id"],
        oauth_session=oauth_session,
    )
    return result.get("reply") or ""


def _run_no_calendar_chat(agent_config_row: Dict[str, Any], message: str,
                          history: List[Dict[str, str]], for_voice: bool) -> str:
    """LLM-only chat for when the business hasn't connected Google Calendar yet.

    The agent can still answer questions about services, hours, and policies using
    its Supabase config — it just can't check real availability or actually book.
    Booking requests are collected verbally and the caller is told someone will
    follow up after the call.
    """
    if not settings.OPENAI_API_KEY:
        return "Sorry, I'm not configured to take this call right now. Please try again later."

    from openai import OpenAI as _OpenAI

    name = agent_config_row.get("name") or "the business"
    services = agent_config_row.get("services") or ""
    hours = agent_config_row.get("business_hours") or ""
    instructions = agent_config_row.get("agent_instructions") or ""
    context = agent_config_row.get("context") or ""

    system_parts = [f"You are an assistant for {name}."]
    if services:
        system_parts.append(f"Services offered: {services}.")
    if hours:
        system_parts.append(f"Business hours: {hours}.")
    if instructions:
        system_parts.append(f"Instructions from the business: {instructions}")
    if context:
        system_parts.append(f"Additional business context:\n{context}")

    if for_voice:
        system_parts.append(
            "You are on a live voice call. Keep replies short and conversational — one or two sentences. "
            "You currently cannot check real-time availability or book directly. "
            "If the caller wants to book, reschedule, or cancel an appointment, collect their name, "
            "preferred date/time, and service verbally, then tell them: "
            "\"Great — I've got those details and someone will confirm with you shortly.\" "
            "Answer questions about services, hours, pricing, and policies using the info above. "
            "Never say things like 'connect Google Calendar' or anything technical."
        )
    else:
        system_parts.append(
            "You are responding by SMS. Keep replies under 300 characters. "
            "You cannot book directly — collect details and say someone will confirm shortly."
        )

    messages: List[Dict[str, str]] = [{"role": "system", "content": " ".join(system_parts)}]
    for h in history:
        messages.append(h)
    messages.append({"role": "user", "content": message or ""})

    client = _OpenAI(api_key=settings.OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=200,
        temperature=0.4,
    )
    return (resp.choices[0].message.content or "").strip()


def _handle_call_ended(agent_row: Dict[str, Any],
                       oauth_session: Optional[Dict[str, Optional[str]]],
                       data: Dict[str, Any]) -> Dict[str, Any]:
    """Persist the conversation + attempt a post-call booking from the full transcript.

    AgentPhone's call_ended payload includes data.transcript as a list of
    {role: 'user'|'agent', content: str}. We normalize that to the
    {role: 'user'|'assistant', content: str} shape extract_and_book expects.
    """
    from ..agents.scheduling_agent import extract_and_book
    from .agent_config import AgentCreate

    transcript_raw = data.get("transcript") or []
    messages: List[Dict[str, str]] = [
        {
            "role": "assistant" if (t.get("role") == "agent") else "user",
            "content": str(t.get("content") or "").strip(),
        }
        for t in transcript_raw
        if (t.get("content") or "").strip()
    ]

    started_at = data.get("startedAt")
    ended_at = data.get("endedAt")
    first_user = next((m["content"] for m in messages if m["role"] == "user"), "")
    summary_text = (data.get("summary") or first_user or "Phone call")[:300]

    # 1) Save the conversation row so Recent Activity shows the call
    conv_id: Optional[Any] = None
    try:
        conv = supabase.table("conversations").insert({
            "agent_id": agent_row["id"],
            "user_id": agent_row["user_id"],
            "summary": summary_text,
            "started_at": started_at,
            "ended_at": ended_at,
        }).execute()
        if conv.data:
            conv_id = conv.data[0].get("id")
    except Exception:
        logger.exception("AgentPhone: failed to save conversation row")

    # 2) Try to actually book the appointment if Calendar is connected
    booking: Optional[Dict[str, Any]] = None
    if oauth_session and oauth_session.get("token") and messages:
        try:
            booking = extract_and_book(
                agent_config=AgentCreate(
                    name=agent_row["name"],
                    services=agent_row.get("services"),
                    business_hours=agent_row.get("business_hours"),
                    agent_instructions=agent_row.get("agent_instructions"),
                    context=agent_row.get("context"),
                ),
                messages=messages,
                user_id=agent_row["user_id"],
                agent_id=agent_row["id"],
                oauth_session=oauth_session,
            )
            logger.info("AgentPhone post-call booking: %s", booking)
        except Exception:
            logger.exception("AgentPhone: extract_and_book failed")
    else:
        logger.info(
            "AgentPhone: skipping post-call booking (oauth=%s, transcript_turns=%d)",
            bool(oauth_session and oauth_session.get("token")), len(messages),
        )

    # 3) Stamp the outcome on the conversation row for the Recent Activity badge
    if conv_id:
        if booking is not None:
            outcome = booking.get("outcome") or ("Booked" if booking.get("booked") else "No result")
        else:
            outcome = "Logged"
        try:
            supabase.table("conversations").update({"outcome": outcome}).eq("id", conv_id).execute()
        except Exception:
            logger.warning("AgentPhone: failed to set conversation outcome", exc_info=True)

    return {"ok": True, "conversation_id": conv_id, "booking": booking}


@router.post("/agentphone")
async def agentphone_webhook(
    request: Request,
    x_webhook_signature: Optional[str] = Header(default=None),
    x_webhook_timestamp: Optional[str] = Header(default=None),
):
    raw = await request.body()

    # Log every arrival BEFORE signature check so a bad signature is still visible
    # in uvicorn output (otherwise debugging looks like total silence).
    try:
        peek = json.loads(raw or b"{}")
        peek_event = peek.get("event")
        peek_channel = peek.get("channel")
        peek_to = (peek.get("data") or {}).get("to")
        peek_from = (peek.get("data") or {}).get("from")
    except Exception:
        peek_event = peek_channel = peek_to = peek_from = None
    logger.info(
        "AgentPhone hit: event=%s channel=%s to=%s from=%s sig_present=%s body_bytes=%d",
        peek_event, peek_channel, peek_to, peek_from, bool(x_webhook_signature), len(raw),
    )

    if not _verify_signature(raw, x_webhook_signature, x_webhook_timestamp):
        logger.warning(
            "AgentPhone: signature mismatch. Received header=%r. "
            "Check AGENTPHONE_WEBHOOK_SECRET in backend/.env matches the one in the AgentPhone dashboard.",
            x_webhook_signature,
        )
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event")
    channel = payload.get("channel")
    data = payload.get("data") or {}
    recent_history = payload.get("recentHistory") or []

    if event not in ("agent.message", "agent.call_ended"):
        logger.info("AgentPhone: ignoring event=%s", event)
        return JSONResponse({"ok": True, "ignored": event})

    to_number = data.get("to") or ""
    agent_row = _lookup_agent_by_number(to_number)
    if not agent_row:
        logger.warning("AgentPhone webhook: no Calendio agent mapped to %s", to_number)
        if event == "agent.message" and channel == "voice":
            return JSONResponse({"text": "Sorry, this number isn't configured. Goodbye.", "hangup": True})
        return JSONResponse({"ok": True, "ignored": "no-agent-mapping"})

    logger.info(
        "AgentPhone: resolved to agent_id=%s name=%r user_id=%s",
        agent_row.get("id"), agent_row.get("name"), agent_row.get("user_id"),
    )

    oauth_session = _load_google_tokens(agent_row["user_id"])

    # Post-call processing: save the conversation + try to book any captured appointment.
    if event == "agent.call_ended":
        logger.info(
            "AgentPhone: call_ended (duration=%ss, transcript_turns=%d)",
            data.get("durationSeconds"), len(data.get("transcript") or []),
        )
        try:
            result = await asyncio.to_thread(_handle_call_ended, agent_row, oauth_session, data)
        except Exception:
            logger.exception("AgentPhone: call_ended handler crashed")
            result = {"ok": False}
        return JSONResponse(result)

    history = _normalize_history(recent_history)
    has_calendar = bool(oauth_session)
    if not has_calendar:
        logger.warning(
            "AgentPhone: user %s has no stored Google tokens — running no-calendar LLM chat.",
            agent_row.get("user_id"),
        )

    def _reply_sync(turn_message: str, for_voice: bool) -> str:
        """Pick the right backend based on whether Calendar is connected."""
        if has_calendar:
            return _run_agent(agent_row, turn_message, history, oauth_session, for_voice)
        return _run_no_calendar_chat(agent_row, turn_message, history, for_voice)

    if channel == "voice":
        # voice transcript is in data.transcript; spec also allows data.message
        message = data.get("transcript") or data.get("message") or ""
        logger.info("AgentPhone voice turn: %r (history=%d turns)", message[:200], len(history))

        async def stream():
            # No interim filler — gpt-4o-mini responds in ~1-2s; the filler was being
            # concatenated into TTS output ("One moment.How can I help…") and annoyed callers.
            # If the call_mode agent ever stalls on a tool call, AgentPhone backchanneling
            # covers the silence.
            try:
                reply = await asyncio.to_thread(_reply_sync, message, True)
            except Exception:
                logger.exception("AgentPhone voice handler failed")
                reply = "Sorry, I ran into a problem. Could you try again?"
            logger.info("AgentPhone voice reply: %r", (reply or "")[:200])
            yield json.dumps({"text": reply or "Could you repeat that?"}) + "\n"

        return StreamingResponse(stream(), media_type="application/x-ndjson")

    if channel == "sms":
        message = data.get("message") or data.get("transcript") or ""
        logger.info("AgentPhone SMS turn: %r", message[:200])
        try:
            reply = await asyncio.to_thread(_reply_sync, message, False)
        except Exception:
            logger.exception("AgentPhone SMS handler failed")
            reply = "Sorry, I ran into a problem. Please try again shortly."
        logger.info("AgentPhone SMS reply: %r", (reply or "")[:200])
        return JSONResponse({"text": reply or "Sorry, I didn't catch that."})

    logger.info("AgentPhone: unknown channel=%s — ignoring", channel)
    return JSONResponse({"ok": True, "ignored": f"unknown-channel:{channel}"})
