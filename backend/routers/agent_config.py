import hashlib
import hmac
import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from ..services.agentphone_api import AgentPhoneError, provision_number, release_number

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel

from ..config import settings
from ..supabase_auth import CurrentUser, get_current_user
from ..supabase_client import supabase

router = APIRouter(prefix="/agents", tags=["agents"])

logger = logging.getLogger("uvicorn.error")


class AgentCreate(BaseModel):
    name: str
    services: Optional[str] = None
    business_hours: Optional[str] = None
    agent_instructions: Optional[str] = None
    context: Optional[str] = None
    agentphone_number: Optional[str] = None


class AgentUpdate(BaseModel):
    # All fields optional — only supplied fields are written to DB
    name: Optional[str] = None
    services: Optional[str] = None
    business_hours: Optional[str] = None
    agent_instructions: Optional[str] = None
    context: Optional[str] = None
    is_active: Optional[bool] = None
    agentphone_number: Optional[str] = None


@router.get("")
def list_agents(current_user: CurrentUser = Depends(get_current_user)):
    result = (
        supabase.table("agent_configs")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{agent_id}")
def get_agent(agent_id: int, current_user: CurrentUser = Depends(get_current_user)):
    result = (
        supabase.table("agent_configs")
        .select("*")
        .eq("id", agent_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Agent not found")
    return result.data[0]


@router.post("")
def create_agent(body: AgentCreate, current_user: CurrentUser = Depends(get_current_user)):
    result = (
        supabase.table("agent_configs")
        .insert({
            "user_id": current_user.id,
            "name": body.name,
            "services": body.services,
            "business_hours": body.business_hours,
            "agent_instructions": body.agent_instructions,
        })
        .execute()
    )
    return result.data[0]


class AgentChatBody(BaseModel):
    message: str
    history: List[Dict[str, Any]] = []


@router.post("/{agent_id}/chat")
def agent_chat(
    agent_id: int,
    body: AgentChatBody,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    from ..agents.scheduling_agent import SchedulingAgent

    result = (
        supabase.table("agent_configs")
        .select("*")
        .eq("id", agent_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Agent not found")

    config_data = result.data[0]
    agent = SchedulingAgent(AgentCreate(
        name=config_data["name"],
        services=config_data.get("services"),
        business_hours=config_data.get("business_hours"),
        agent_instructions=config_data.get("agent_instructions"),
        context=config_data.get("context"),
    ), call_mode=True)
    # Individual turns are NOT logged here — the full conversation is saved as one
    # record when the user ends the call (POST /{agent_id}/conversations).
    try:
        return agent.run(
            user_id=current_user.id,
            message=body.message,
            history=body.history,
            request=request,
            agent_id=agent_id,
        )
    except Exception:
        logger.exception("Unhandled error in agent_chat for agent %s", agent_id)
        return {"reply": "I'm sorry, I ran into an unexpected issue. Please try again in a moment."}


class SaveConversationBody(BaseModel):
    # Full transcript — list of {role: "user"|"assistant", content: "..."}
    messages: List[Dict[str, str]]
    elapsed_seconds: int = 0


@router.post("/{agent_id}/conversations")
def save_conversation(
    agent_id: int,
    body: SaveConversationBody,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Save a complete conversation session when the user ends the call."""
    user_turns = sum(1 for m in body.messages if m.get("role") == "user")

    ended_at = datetime.utcnow()
    started_at = ended_at - timedelta(seconds=body.elapsed_seconds)

    # Build a readable summary: first user message truncated
    first_user = next((m["content"] for m in body.messages if m.get("role") == "user"), None)
    summary_text = first_user[:200] if first_user else f"{user_turns} message{'s' if user_turns != 1 else ''} exchanged"

    supabase.table("conversations").insert({
        "agent_id": agent_id,
        "user_id": current_user.id,
        "summary": summary_text,
        "started_at": started_at.isoformat(),
        "ended_at": ended_at.isoformat(),
    }).execute()

    # Increment conversation count in metrics
    try:
        metric = supabase.table("metrics").select("*").eq("user_id", current_user.id).execute()
        if metric.data:
            supabase.table("metrics").update({
                "total_conversations": metric.data[0]["total_conversations"] + 1,
            }).eq("user_id", current_user.id).execute()
        else:
            supabase.table("metrics").insert({
                "agent_id": agent_id,
                "user_id": current_user.id,
                "total_conversations": 1,
                "total_appointments_created": 0,
            }).execute()
    except Exception as exc:
        logger.warning("Failed to update metrics after conversation save: %s", exc)

    return {"saved": True, "turns": user_turns}


@router.patch("/{agent_id}")
def update_agent(
    agent_id: int,
    body: AgentUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    # Verify agent belongs to this user
    existing = (
        supabase.table("agent_configs")
        .select("id")
        .eq("id", agent_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Only update fields that were explicitly included in the request body
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("agent_configs")
        .update(updates)
        .eq("id", agent_id)
        .execute()
    )
    return result.data[0]


PDF_PAGE_LIMIT = 6


@router.post("/{agent_id}/upload-context")
def upload_context_pdf(
    agent_id: int,
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Extract text from a PDF (max 6 pages) and save it as the agent's context."""
    import io
    try:
        import pdfplumber
    except ImportError:
        raise HTTPException(status_code=500, detail="pdfplumber is not installed on the server.")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Verify agent belongs to this user
    existing = (
        supabase.table("agent_configs")
        .select("id")
        .eq("id", agent_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Agent not found.")

    raw = file.file.read()
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        page_count = len(pdf.pages)
        if page_count > PDF_PAGE_LIMIT:
            raise HTTPException(
                status_code=400,
                detail=f"PDF has {page_count} pages — limit is {PDF_PAGE_LIMIT}. Please upload a shorter document.",
            )
        text_parts = []
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text.strip())

    extracted = "\n\n".join(text_parts).strip()
    if not extracted:
        raise HTTPException(status_code=400, detail="Could not extract any text from the PDF.")

    result = (
        supabase.table("agent_configs")
        .update({"context": extracted})
        .eq("id", agent_id)
        .execute()
    )
    return {"extracted_chars": len(extracted), "pages": page_count, "context": extracted}


# ── VOICE: SPEECH-TO-TEXT ────────────────────────────────────────────────────

@router.post("/{agent_id}/transcribe")
def transcribe_audio(
    agent_id: int,
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Receive a voice recording from the browser (webm/opus from MediaRecorder),
    send it to OpenAI Whisper (gpt-4o-transcribe), and return the transcribed text.
    The frontend then sends that text through the normal chat endpoint.
    """
    import io
    from openai import OpenAI as _OpenAI

    # Reject requests for agents that don't belong to this user
    existing = (
        supabase.table("agent_configs")
        .select("id")
        .eq("id", agent_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Agent not found.")

    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

    raw = file.file.read()
    # Use the original filename so OpenAI knows the codec; fall back to .webm
    filename = file.filename or "recording.webm"
    content_type = file.content_type or "audio/webm"

    client = _OpenAI(api_key=settings.OPENAI_API_KEY)
    transcription = client.audio.transcriptions.create(
        model="gpt-4o-transcribe",
        file=(filename, io.BytesIO(raw), content_type),
    )
    return {"text": transcription.text}


# ── VOICE: TEXT-TO-SPEECH ────────────────────────────────────────────────────

class SpeakBody(BaseModel):
    text: str
    voice: str = "nova"    # default: bright, energetic voice — fits salon/restaurant staff
    speed: float = 1.15    # slightly faster than default for a natural cashier cadence


@router.post("/{agent_id}/speak")
def speak_text(
    agent_id: int,
    body: SpeakBody,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Convert the agent's text reply to speech using OpenAI TTS (gpt-4o-mini-tts)
    and stream back raw MP3 bytes.  The frontend creates a blob URL and plays it
    with an <audio> element, giving the agent its voice.
    """
    from openai import OpenAI as _OpenAI

    existing = (
        supabase.table("agent_configs")
        .select("id")
        .eq("id", agent_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Agent not found.")

    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

    client = _OpenAI(api_key=settings.OPENAI_API_KEY)
    # gpt-4o-mini-tts is the fastest high-quality TTS model; mp3 works in all browsers
    tts_response = client.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice=body.voice,
        input=body.text,
        response_format="mp3",
        speed=body.speed,
    )
    return Response(content=tts_response.content, media_type="audio/mpeg")


@router.get("/{agent_id}/realtime-token")
def get_realtime_token(
    agent_id: int,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Create a short-lived OpenAI Realtime API ephemeral token so the browser
    can open a transcription WebSocket directly — no API key ever reaches
    the client.  The session is configured with semantic VAD so the API
    automatically detects when the caller has finished speaking.
    """
    existing = (
        supabase.table("agent_configs")
        .select("id")
        .eq("id", agent_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Agent not found.")

    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured.")

    # Return the API key directly — the browser WebSocket uses the
    # openai-insecure-api-key subprotocol which is designed for client-side use.
    # This bypasses the GA session-creation endpoint (which rejects beta accounts)
    # while keeping the key out of frontend source code.
    return {"client_secret": {"value": settings.OPENAI_API_KEY}}


# ── AGENTPHONE CONNECT / PROVISION / DISCONNECT ──────────────────────────────

_E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")


class AgentPhoneConnectBody(BaseModel):
    phone_number: str
    webhook_secret: str


class AgentPhoneProvisionBody(BaseModel):
    area_code: Optional[str] = None


def _get_agent_for_user(agent_id: int, user_id: str) -> Dict[str, Any]:
    result = (
        supabase.table("agent_configs")
        .select("*")
        .eq("id", agent_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Agent not found.")
    return result.data[0]


def _check_number_unique(phone_number: str, exclude_agent_id: int) -> None:
    existing = (
        supabase.table("agent_configs")
        .select("id", "name")
        .eq("agentphone_number", phone_number)
        .neq("id", exclude_agent_id)
        .execute()
    )
    if existing.data:
        other = existing.data[0]
        raise HTTPException(
            status_code=409,
            detail=f"That number is already assigned to agent '{other['name']}' (id={other['id']}).",
        )


@router.post("/{agent_id}/agentphone/connect")
def agentphone_connect(
    agent_id: int,
    body: AgentPhoneConnectBody,
    current_user: CurrentUser = Depends(get_current_user),
):
    """BYON: validate and save a user-supplied AgentPhone number + webhook secret."""
    _get_agent_for_user(agent_id, current_user.id)

    number = body.phone_number.strip()
    if not _E164_RE.match(number):
        raise HTTPException(status_code=422, detail="Phone number must be in E.164 format (e.g. +14155551234).")

    _check_number_unique(number, agent_id)

    secret = body.webhook_secret.strip()
    if not secret:
        raise HTTPException(status_code=422, detail="Webhook secret cannot be empty.")

    # HMAC self-test: sign a dummy payload with the provided secret and verify
    # it round-trips correctly through our own verification logic.
    dummy = b'{"event":"test"}'
    sig = "sha256=" + hmac.new(secret.encode(), dummy, hashlib.sha256).hexdigest()
    expected = "sha256=" + hmac.new(secret.encode(), dummy, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=422, detail="Webhook secret failed internal validation.")

    result = (
        supabase.table("agent_configs")
        .update({
            "agentphone_number": number,
            "agentphone_webhook_secret": secret,
            "agentphone_managed": False,
            "agentphone_number_id": None,
        })
        .eq("id", agent_id)
        .execute()
    )
    return result.data[0]


@router.post("/{agent_id}/agentphone/provision")
def agentphone_provision(
    agent_id: int,
    body: AgentPhoneProvisionBody,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Managed: buy a new AgentPhone number on behalf of the user.

    Checks phone_credits > 0 (payment gate placeholder), calls the AgentPhone API,
    then saves the number + number_id to the agent row and decrements credits.
    """
    _get_agent_for_user(agent_id, current_user.id)

    # Payment gate — check user has credits
    user_row = supabase.table("users").select("phone_credits").eq("id", current_user.id).execute()
    credits = (user_row.data[0].get("phone_credits") or 0) if user_row.data else 0
    if credits <= 0:
        raise HTTPException(
            status_code=402,
            detail="You have no phone number credits. Please add credits to provision a number.",
        )

    try:
        provisioned = provision_number(area_code=body.area_code or None)
    except AgentPhoneError as e:
        raise HTTPException(status_code=502, detail=f"AgentPhone error: {e.detail}")

    number = provisioned.get("number") or provisioned.get("phoneNumber") or ""
    number_id = str(provisioned.get("id") or provisioned.get("numberId") or "")

    if not number:
        raise HTTPException(status_code=502, detail="AgentPhone returned no phone number.")

    # Decrement credits atomically (best-effort — already provisioned, don't block)
    try:
        supabase.table("users").update({"phone_credits": credits - 1}).eq("id", current_user.id).execute()
    except Exception:
        logging.getLogger("uvicorn.error").warning("Failed to decrement phone_credits for user %s", current_user.id)

    result = (
        supabase.table("agent_configs")
        .update({
            "agentphone_number": number,
            "agentphone_number_id": number_id,
            "agentphone_managed": True,
            "agentphone_webhook_secret": None,
        })
        .eq("id", agent_id)
        .execute()
    )
    return {**result.data[0], "provisioned_number": number}


@router.delete("/{agent_id}/agentphone/connect")
def agentphone_disconnect(
    agent_id: int,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Disconnect AgentPhone from an agent. Releases managed numbers back to AgentPhone."""
    agent = _get_agent_for_user(agent_id, current_user.id)

    if agent.get("agentphone_managed") and agent.get("agentphone_number_id"):
        try:
            release_number(agent["agentphone_number_id"])
        except AgentPhoneError as e:
            logging.getLogger("uvicorn.error").warning(
                "AgentPhone: failed to release number %s: %s", agent["agentphone_number_id"], e.detail
            )

    result = (
        supabase.table("agent_configs")
        .update({
            "agentphone_number": None,
            "agentphone_number_id": None,
            "agentphone_managed": None,
            "agentphone_webhook_secret": None,
        })
        .eq("id", agent_id)
        .execute()
    )
    return result.data[0]


class BookFromTranscriptBody(BaseModel):
    messages: List[Dict[str, Any]]


@router.post("/{agent_id}/book-from-transcript")
def book_from_transcript(
    agent_id: int,
    body: BookFromTranscriptBody,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Called after a voice call ends.  Parse the full transcript with an LLM,
    extract any booking intent, and create the Google Calendar appointment.
    """
    from ..agents.scheduling_agent import extract_and_book

    result = (
        supabase.table("agent_configs")
        .select("*")
        .eq("id", agent_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Agent not found")

    if "token" not in request.session:
        return {"booked": False, "error": "Google Calendar not connected"}

    config_data = result.data[0]
    booking = extract_and_book(
        agent_config=AgentCreate(
            name=config_data["name"],
            services=config_data.get("services"),
            business_hours=config_data.get("business_hours"),
            agent_instructions=config_data.get("agent_instructions"),
            context=config_data.get("context"),
        ),
        messages=body.messages,
        user_id=current_user.id,
        agent_id=agent_id,
        oauth_session={
            "token":         request.session.get("token"),
            "refresh_token": request.session.get("refresh_token"),
        },
    )

    # Write the outcome back to the most recent conversation row for this agent.
    # This is what the Recent Activity feed reads to show the outcome badge.
    outcome = booking.get("outcome") or ("Booked" if booking.get("booked") else "No result")
    try:
        latest = (
            supabase.table("conversations")
            .select("id")
            .eq("user_id", current_user.id)
            .eq("agent_id", agent_id)
            .order("ended_at", desc=True)
            .limit(1)
            .execute()
        )
        if latest.data:
            supabase.table("conversations").update({"outcome": outcome}).eq("id", latest.data[0]["id"]).execute()
    except Exception as exc:
        logger.warning("Failed to update conversation outcome: %s", exc)

    return booking


@router.delete("/{agent_id}")
def delete_agent(agent_id: int, current_user: CurrentUser = Depends(get_current_user)):
    existing = (
        supabase.table("agent_configs")
        .select("id")
        .eq("id", agent_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Agent not found")

    supabase.table("agent_configs").delete().eq("id", agent_id).execute()
    return {"ok": True}
