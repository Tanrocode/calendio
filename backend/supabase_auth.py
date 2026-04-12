from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
import jwt

from .config import settings
from .database import get_db
from .models.user import User
from .models.business import Business

_bearer = HTTPBearer()


def _verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    """Decode and verify a Supabase-issued JWT. Returns the full payload."""
    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


def get_current_user(
    payload: dict = Depends(_verify_jwt),
    db: Session = Depends(get_db),
) -> User:
    """
    Resolve the JWT sub claim to a local User row.
    Creates a Business + User automatically on first login.
    """
    supabase_uid: str = payload["sub"]
    email: str = payload.get("email", "")

    user = db.query(User).filter_by(supabase_uid=supabase_uid).first()
    if user:
        return user

    # First login — provision a business and user row.
    business = Business(name=email or "My Business")
    db.add(business)
    db.flush()

    user = User(supabase_uid=supabase_uid, email=email, business_id=business.id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
