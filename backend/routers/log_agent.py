from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from ..database import get_db
from ..agents.scheduling_agent import SchedulingAgent
from ..models import conversation as conversation_model, metric as metric_model

router = APIRouter()


class AgentChatBody(BaseModel):
    business_id: int
    message: str


@router.post("/agent/chat")
def agent_chat(
    body: AgentChatBody,
    db: Session = Depends(get_db),
):
    """Run the scheduling agent, log the conversation, update metrics, return the agent reply."""
    business_id = body.business_id
    message = body.message
    agent = SchedulingAgent(db=db)
    agent_response = agent.run(business_id=business_id, message=message)

    # Log conversation
    conv = conversation_model.Conversation(
        business_id=business_id,
        message=message,
        response=agent_response["reply"],
        timestamp=datetime.utcnow()
    )
    db.add(conv)
    db.commit()

    # Update metrics
    metric = db.query(metric_model.Metric).filter_by(business_id=business_id).first()
    if not metric:
        metric = metric_model.Metric(business_id=business_id, total_conversations=1)
        db.add(metric)
    else:
        metric.total_conversations += 1
    db.commit()

    return agent_response
