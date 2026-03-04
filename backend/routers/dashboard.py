from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import metric as metric_model, appointment as appointment_model

router = APIRouter()

@router.get("/dashboard/metrics/{business_id}")
def get_metrics(business_id: int, db: Session = Depends(get_db)):
    """
    Returns metrics and upcoming appointments for a business.
    """
    metric = db.query(metric_model.Metric).filter_by(business_id=business_id).first()
    appointments = db.query(appointment_model.Appointment).filter_by(business_id=business_id).all()
    upcoming = [
        {
            "customer_name": a.customer_name,
            "service": a.service,
            "start_time": a.start_time,
            "end_time": a.end_time
        }
        for a in appointments
    ]
    return {
        "metrics": {
            "total_conversations": metric.total_conversations if metric else 0,
            "total_appointments_created": metric.total_appointments_created if metric else 0
        },
        "upcoming_appointments": upcoming
    }
