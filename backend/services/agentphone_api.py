"""
Thin client for the AgentPhone REST API (https://api.agentphone.ai/v1).
All calls raise AgentPhoneError on non-2xx responses.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

from ..config import settings

logger = logging.getLogger("uvicorn.error")

BASE_URL = "https://api.agentphone.ai/v1"


class AgentPhoneError(Exception):
    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(f"AgentPhone API error {status}: {detail}")


def _headers() -> Dict[str, str]:
    key = settings.AGENTPHONE_API_KEY
    if not key:
        raise AgentPhoneError(0, "AGENTPHONE_API_KEY is not set")
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _raise_for(resp: httpx.Response) -> None:
    if resp.is_success:
        return
    try:
        detail = resp.json().get("message") or resp.json().get("error") or resp.text
    except Exception:
        detail = resp.text
    raise AgentPhoneError(resp.status_code, detail)


def provision_number(area_code: Optional[str] = None) -> Dict[str, Any]:
    """Buy a new phone number from AgentPhone.

    Returns a dict with at minimum:
      - 'number'     : E.164 phone number, e.g. '+14155551234'
      - 'id'         : AgentPhone's internal number ID (needed to release later)
    """
    body: Dict[str, Any] = {}
    if area_code:
        body["areaCode"] = area_code.strip()

    with httpx.Client(timeout=20) as client:
        resp = client.post(f"{BASE_URL}/numbers", headers=_headers(), json=body)

    _raise_for(resp)
    data = resp.json()
    logger.info("AgentPhone: provisioned number %s (id=%s)", data.get("number"), data.get("id"))
    return data


def release_number(number_id: str) -> None:
    """Release a previously provisioned number back to AgentPhone."""
    with httpx.Client(timeout=20) as client:
        resp = client.delete(f"{BASE_URL}/numbers/{number_id}", headers=_headers())

    _raise_for(resp)
    logger.info("AgentPhone: released number id=%s", number_id)


def list_numbers() -> list[Dict[str, Any]]:
    """List all numbers on the AgentPhone account."""
    with httpx.Client(timeout=20) as client:
        resp = client.get(f"{BASE_URL}/numbers", headers=_headers())

    _raise_for(resp)
    return resp.json()
