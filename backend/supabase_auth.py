from dataclasses import dataclass

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .supabase_client import supabase


def _supabase_execute(fn):
    """Run a supabase-py query, retrying once on stale HTTP/2 connection errors.

    When an H2 connection idles out the server closes it, but the httpcore pool
    still considers it live.  The first attempt fails with RemoteProtocolError;
    httpcore then drops the bad connection so the retry gets a fresh one.
    """
    for attempt in range(2):
        try:
            return fn()
        except httpx.RemoteProtocolError:
            if attempt == 0:
                continue
            raise

_bearer = HTTPBearer()


def get_user_from_token(token: str) -> "CurrentUser":
    """Verify a raw Supabase JWT and return the local user record.
    Used by routes that optionally accept a Bearer token (e.g. Google OAuth flow)."""
    response = supabase.auth.get_user(token)
    if not response.user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    supabase_uid = response.user.id
    email = response.user.email or ""
    result = _supabase_execute(
        lambda: supabase.table("users").select("*").eq("supabase_uid", supabase_uid).execute()
    )
    if result.data:
        row = result.data[0]
        return CurrentUser(id=row["id"], supabase_uid=row["supabase_uid"], email=row["email"])
    insert = _supabase_execute(
        lambda: supabase.table("users").insert({"supabase_uid": supabase_uid, "email": email}).execute()
    )
    row = insert.data[0]
    return CurrentUser(id=row["id"], supabase_uid=row["supabase_uid"], email=row["email"])


@dataclass
class CurrentUser:
    id: int
    supabase_uid: str
    email: str


def _verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    try:
        response = supabase.auth.get_user(credentials.credentials)
        if not response.user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return {"sub": response.user.id, "email": response.user.email or ""}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


def get_current_user(payload: dict = Depends(_verify_jwt)) -> CurrentUser:
    supabase_uid: str = payload["sub"]
    email: str = payload.get("email", "")

    result = _supabase_execute(
        lambda: supabase.table("users").select("*").eq("supabase_uid", supabase_uid).execute()
    )

    if result.data:
        row = result.data[0]
        return CurrentUser(id=row["id"], supabase_uid=row["supabase_uid"], email=row["email"])

    # First login — create user row
    insert = _supabase_execute(
        lambda: supabase.table("users").insert({"supabase_uid": supabase_uid, "email": email}).execute()
    )
    row = insert.data[0]
    return CurrentUser(id=row["id"], supabase_uid=row["supabase_uid"], email=row["email"])
