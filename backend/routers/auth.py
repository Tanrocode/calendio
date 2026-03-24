from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
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

BACKEND_DIR = Path(__file__).resolve().parent.parent
_CREDENTIALS_CANDIDATES = [
    BACKEND_DIR / 'credentials.json',
    BACKEND_DIR / 'agents' / 'credentials.json',
]


def _credentials_path() -> Path:
    for p in _CREDENTIALS_CANDIDATES:
        if p.is_file():
            return p
    return _CREDENTIALS_CANDIDATES[0]


FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://127.0.0.1:3000')
SCOPES = ['https://www.googleapis.com/auth/calendar.events']
# Port in redirect URIs must match where you run uvicorn (default 8000).
API_PORT = int(os.getenv('API_PORT', os.getenv('FLASK_PORT', '8000')))
REDIRECT_LOCALHOST = f'http://localhost:{API_PORT}/oauth/callback'
REDIRECT_127 = f'http://127.0.0.1:{API_PORT}/oauth/callback'


class AddEventBody(BaseModel):
    title: str = 'New event'
    description: str = ''
    start: str
    end: str


def _redirect_uri_and_frontend_for_request(request: Request):
    origin = (request.headers.get('origin') or '').rstrip('/')
    if origin == 'http://localhost:3000':
        return REDIRECT_LOCALHOST, 'http://localhost:3000'
    if origin == 'http://127.0.0.1:3000':
        return REDIRECT_127, 'http://127.0.0.1:3000'
    return REDIRECT_127, FRONTEND_URL.rstrip('/')


def get_flow(redirect_uri: str) -> Flow:
    return Flow.from_client_secrets_file(
        str(_credentials_path()),
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )


def _build_credentials(request: Request) -> Credentials:
    return Credentials(
        token=request.session['token'],
        refresh_token=request.session['refresh_token'],
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.getenv('GOOGLE_CLIENT_ID'),
        client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    )


@router.get('/auth/url')
def auth_url(request: Request):
    redirect_uri, frontend = _redirect_uri_and_frontend_for_request(request)
    request.session['oauth_redirect_uri'] = redirect_uri
    request.session['frontend_origin'] = frontend
    flow = get_flow(redirect_uri)
    url, state = flow.authorization_url(access_type='offline')
    request.session['state'] = state
    return {'url': url}


@router.get('/test-add-event')
def test_add_event(request: Request):
    if 'token' not in request.session:
        raise HTTPException(status_code=401, detail='Not authenticated')
    return {'token_exists': True, 'token': request.session['token']}


@router.get('/oauth/callback')
def callback(request: Request):
    try:
        redirect_uri = request.session.get('oauth_redirect_uri') or REDIRECT_127
        flow = get_flow(redirect_uri)
        flow.fetch_token(authorization_response=str(request.url))
        credentials = flow.credentials
        request.session['token'] = credentials.token
        request.session['refresh_token'] = credentials.refresh_token
        front = request.session.get('frontend_origin') or FRONTEND_URL.rstrip('/')
        return RedirectResponse(url=f'{front}/dashboard')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/test-create-event')
def test_create_event(request: Request):
    if 'token' not in request.session:
        raise HTTPException(status_code=401, detail='Not authenticated')

    creds = _build_credentials(request)
    service = build('calendar', 'v3', credentials=creds)
    event = {
        'summary': 'Test Event',
        'description': 'Hello',
        'start': {
            'dateTime': '2026-03-10T10:00:00',
            'timeZone': 'America/Los_Angeles',
        },
        'end': {
            'dateTime': '2026-03-10T11:00:00',
            'timeZone': 'America/Los_Angeles',
        },
    }
    created_event = service.events().insert(calendarId='primary', body=event).execute()
    return {'success': True, 'link': created_event.get('htmlLink')}


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
