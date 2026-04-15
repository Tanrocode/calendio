from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from .config import settings
from .supabase_client import supabase

_bearer = HTTPBearer()


@dataclass
class CurrentUser:
    id: int
    supabase_uid: str
    email: str


def _verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
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


def get_current_user(payload: dict = Depends(_verify_jwt)) -> CurrentUser:
    supabase_uid: str = payload["sub"]
    email: str = payload.get("email", "")

    result = supabase.table("users").select("*").eq("supabase_uid", supabase_uid).execute()

    if result.data:
        row = result.data[0]
        return CurrentUser(id=row["id"], supabase_uid=row["supabase_uid"], email=row["email"])

    # First login — create user row
    insert = supabase.table("users").insert({"supabase_uid": supabase_uid, "email": email}).execute()
    row = insert.data[0]
    return CurrentUser(id=row["id"], supabase_uid=row["supabase_uid"], email=row["email"])
