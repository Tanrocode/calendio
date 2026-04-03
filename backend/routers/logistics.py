from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import metric as metric_model, appointment as appointment_model


router = APIRouter()

