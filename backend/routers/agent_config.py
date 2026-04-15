from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..supabase_auth import CurrentUser, get_current_user
from ..supabase_client import supabase

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentCreate(BaseModel):
    name: str
    services: Optional[str] = None
    business_hours: Optional[str] = None
    agent_instructions: Optional[str] = None


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
