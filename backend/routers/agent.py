from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..schemas.conversation import ConversationCreate, Conversation
from ..schemas.metric import Metric
from ..agents.scheduling_agent import SchedulingAgent
from ..models import conversation as conversation_model, metric as metric_model

router = APIRouter()

@router.post("/agent/chat")
def agent_chat(
    business_id: int,
    message: str,
    db: Session = Depends(get_db)
):
    """
    Runs the scheduling agent, logs the conversation, updates metrics, and returns the agent response.
    """
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
