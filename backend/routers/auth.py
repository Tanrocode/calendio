import time
from typing import Dict, Optional, Tuple

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()
os.environ.setdefault('OAUTHLIB_INSECURE_TRANSPORT', '1')

router = APIRouter(tags=['google-oauth'])

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
SCOPES = ['https://www.googleapis.com/auth/calendar.events']
API_PORT = int(os.getenv('API_PORT', os.getenv('FLASK_PORT', '8000')))
REDIRECT_LOCALHOST = f'http://localhost:{API_PORT}/oauth/callback'
REDIRECT_127 = f'http://127.0.0.1:{API_PORT}/oauth/callback'

# Keyed by OAuth state — avoids session cookie host-mismatch for PKCE
_OAUTH_PENDING: Dict[str, Tuple[dict, float]] = {}
_OAUTH_TTL = 300  # seconds


def _pending_store(state: str, data: dict) -> None:
    _OAUTH_PENDING[state] = (data, time.monotonic())
    cutoff = time.monotonic() - _OAUTH_TTL
    for k in [k for k, (_, ts) in _OAUTH_PENDING.items() if ts < cutoff]:
        del _OAUTH_PENDING[k]


def _pending_pop(state: str) -> Optional[dict]:
    entry = _OAUTH_PENDING.pop(state, None)
    if not entry:
        return None
    data, ts = entry
    return data if time.monotonic() - ts <= _OAUTH_TTL else None


class AddEventBody(BaseModel):
    title: str = 'New event'
    description: str = ''
    start: str
    end: str


def _redirect_uri_and_frontend_for_request(request: Request):
    origin = (request.headers.get('origin') or '').rstrip('/')
    referer = request.headers.get('referer') or ''
    hint = origin or referer
    if '127.0.0.1' in hint:
        return REDIRECT_127, 'http://127.0.0.1:3000'
    return REDIRECT_LOCALHOST, 'http://localhost:3000'


def get_flow(redirect_uri: str) -> Flow:
    client_config = {
        'web': {
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
            'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
            'token_uri': 'https://oauth2.googleapis.com/token',
            'redirect_uris': [redirect_uri],
        }
    }
    return Flow.from_client_config(
        client_config, scopes=SCOPES, redirect_uri=redirect_uri,
        autogenerate_code_verifier=True,
    )


def _build_credentials(request: Request) -> Credentials:
    return Credentials(
        token=request.session['token'],
        refresh_token=request.session['refresh_token'],
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.getenv('GOOGLE_CLIENT_ID'),
        client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    )


def _safe_oauth_next_path(next: Optional[str]) -> str:
    """Where to send the browser after Google OAuth (path on frontend only)."""
    if not next or not isinstance(next, str):
        return "/dashboard"
    n = next.strip().split("?")[0]
    if not n.startswith("/") or n.startswith("//"):
        return "/dashboard"
    return n[:128]


@router.get('/auth/url')
def auth_url(request: Request, next: Optional[str] = Query(None)):
    redirect_uri, frontend = _redirect_uri_and_frontend_for_request(request)
    flow = get_flow(redirect_uri)
    url, state = flow.authorization_url(access_type='offline')
    _pending_store(state, {
        'code_verifier': flow.code_verifier,
        'redirect_uri': redirect_uri,
        'frontend': frontend,
        'next_path': _safe_oauth_next_path(next),
    })
    return {'url': url}


@router.get('/oauth/callback')
def callback(request: Request):
    try:
        state = request.query_params.get('state', '')
        pending = _pending_pop(state)
        if not pending:
            raise HTTPException(status_code=400, detail='OAuth state not found or expired')
        redirect_uri = pending['redirect_uri']
        flow = get_flow(redirect_uri)
        flow.code_verifier = pending['code_verifier']
        flow.oauth2session._state = state
        flow.fetch_token(authorization_response=str(request.url))
        credentials = flow.credentials
        request.session['token'] = credentials.token
        request.session['refresh_token'] = credentials.refresh_token
        front = pending['frontend']
        next_path = _safe_oauth_next_path(pending['next_path'])
        return RedirectResponse(url=f'{front}{next_path}')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/test-add-event')
def test_add_event(request: Request):
    if 'token' not in request.session:
        raise HTTPException(status_code=401, detail='Not authenticated')
    return {'token_exists': True, 'token': request.session['token']}


@router.post('/add-event')
def add_event(body: AddEventBody, request: Request):
    if 'token' not in request.session:
        raise HTTPException(status_code=401, detail='Not authenticated')

    creds = _build_credentials(request)
    service = build('calendar', 'v3', credentials=creds)
    event = {
        'summary': body.title,
        'description': body.description,
        'start': {
            'dateTime': body.start + ':00',
            'timeZone': 'America/Los_Angeles',
        },
        'end': {
            'dateTime': body.end + ':00',
            'timeZone': 'America/Los_Angeles',
        },
    }
    created_event = service.events().insert(calendarId='primary', body=event).execute()
    return {'success': True, 'link': created_event.get('htmlLink')}
