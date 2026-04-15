from datetime import datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from ..agents.scheduling_agent import SchedulingAgent
from ..supabase_auth import CurrentUser, get_current_user
from ..supabase_client import supabase

router = APIRouter()


class AgentChatBody(BaseModel):
    message: str


@router.post("/agent/chat")
def agent_chat(
    body: AgentChatBody,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    agent = SchedulingAgent()
    agent_response = agent.run(user_id=current_user.id, message=body.message, request=request)

    # Log conversation
    supabase.table("conversations").insert({
        "user_id": current_user.id,
        "message": body.message,
        "response": agent_response["reply"],
        "timestamp": datetime.utcnow().isoformat(),
    }).execute()

    # Upsert metrics
    metric_result = supabase.table("metrics").select("*").eq("user_id", current_user.id).execute()
    appointment_created = bool(agent_response.get("appointment_created"))

    if metric_result.data:
        metric = metric_result.data[0]
        supabase.table("metrics").update({
            "total_conversations": metric["total_conversations"] + 1,
            "total_appointments_created": metric["total_appointments_created"] + (1 if appointment_created else 0),
        }).eq("user_id", current_user.id).execute()
    else:
        supabase.table("metrics").insert({
            "user_id": current_user.id,
            "total_conversations": 1,
            "total_appointments_created": 1 if appointment_created else 0,
        }).execute()

    return agent_response
