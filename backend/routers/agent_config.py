import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
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


class AgentUpdate(BaseModel):
    # All fields optional — only supplied fields are written to DB
    name: Optional[str] = None
    services: Optional[str] = None
    business_hours: Optional[str] = None
    agent_instructions: Optional[str] = None
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
    ))
    result = agent.run(
        user_id=current_user.id,
        message=body.message,
        history=body.history,
        request=request,
        agent_id=agent_id,
    )

    # Log conversation so Recent Activity on the dashboard can show it
    try:
        supabase.table("conversations").insert({
            "user_id": current_user.id,
            "message": body.message,
            "response": result["reply"],
            "timestamp": datetime.utcnow().isoformat(),
        }).execute()

        # Increment total_conversations metric
        metric = supabase.table("metrics").select("*").eq("user_id", current_user.id).execute()
        if metric.data:
            supabase.table("metrics").update({
                "total_conversations": metric.data[0]["total_conversations"] + 1,
            }).eq("user_id", current_user.id).execute()
        else:
            supabase.table("metrics").insert({
                "user_id": current_user.id,
                "total_conversations": 1,
                "total_appointments_created": 0,
            }).execute()
    except Exception as exc:
        # Logging failure shouldn't break the chat response
        logger.warning("Failed to log conversation: %s", exc)

    return result


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
