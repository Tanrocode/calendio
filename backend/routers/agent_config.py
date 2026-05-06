import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

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


class AgentUpdate(BaseModel):
    # All fields optional — only supplied fields are written to DB
    name: Optional[str] = None
    services: Optional[str] = None
    business_hours: Optional[str] = None
    agent_instructions: Optional[str] = None
    context: Optional[str] = None
    is_active: Optional[bool] = None


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
    ))
    # Individual turns are NOT logged here — the full conversation is saved as one
    # record when the user ends the call (POST /{agent_id}/conversations).
    return agent.run(
        user_id=current_user.id,
        message=body.message,
        history=body.history,
        request=request,
        agent_id=agent_id,
    )


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
