from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import metric as metric_model, appointment as appointment_model
from ..models.user import User
from ..supabase_auth import get_current_user

router = APIRouter()


@router.get("/dashboard/metrics")
def get_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns metrics and upcoming appointments for the authenticated user's business.
    """
    business_id = current_user.business_id
    metric = db.query(metric_model.Metric).filter_by(business_id=business_id).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC, matches DB storage
    upcoming_rows = (
        db.query(appointment_model.Appointment)
        .filter(
            appointment_model.Appointment.business_id == business_id,
            appointment_model.Appointment.start_time >= now,
        )
        .order_by(appointment_model.Appointment.start_time)
        .all()
    )

    upcoming = [
        {
            "customer_name": a.customer_name,
            "service": a.service,
            "start_time": a.start_time.isoformat() if a.start_time else None,
            "end_time": a.end_time.isoformat() if a.end_time else None,
        }
        for a in upcoming_rows
    ]

    return {
        "metrics": {
            "total_conversations": metric.total_conversations if metric else 0,
            "total_appointments_created": metric.total_appointments_created if metric else 0,
        },
        "upcoming_appointments": upcoming,
    }
