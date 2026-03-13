from flask import Flask, redirect, request, session, url_for, jsonify
from flask_cors import CORS
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv
import os

load_dotenv()

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY')

# Session cookie must be sent on XHR to this API. localhost vs 127.0.0.1 are
# different sites — Lax cookies are NOT sent on cross-site POST. OAuth runs on
# Port 5001 (AirPlay uses :5000). Use API host = page host: localhost:3000 → localhost:5001 API
# so session cookies match; same for 127.0.0.1.
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Browsers send Origin: http://127.0.0.1:3000 — must echo it (not *) when using credentials.
ALLOWED_CORS_ORIGINS = frozenset(
    {
        'http://127.0.0.1:3000',
        'http://localhost:3000',
    }
)

CORS(
    app,
    origins=list(ALLOWED_CORS_ORIGINS),
    supports_credentials=True,
    allow_headers=['Content-Type', 'Authorization'],
    methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
)


@app.after_request
def _cors_on_every_response(response):
    """Ensures CORS headers even if flask-cors misses a path or an error occurs first."""
    origin = request.headers.get('Origin')
    if origin in ALLOWED_CORS_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response


FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://127.0.0.1:3000')

SCOPES = ['https://www.googleapis.com/auth/calendar.events']
API_PORT = int(os.getenv('FLASK_PORT', '5001'))
REDIRECT_LOCALHOST = f'http://localhost:{API_PORT}/oauth/callback'
REDIRECT_127 = f'http://127.0.0.1:{API_PORT}/oauth/callback'


def _redirect_uri_and_frontend_for_request():
    """Match OAuth redirect + post-login redirect to how the user opened the app."""
    origin = (request.headers.get('Origin') or '').rstrip('/')
    if origin == 'http://localhost:3000':
        return REDIRECT_LOCALHOST, 'http://localhost:3000'
    if origin == 'http://127.0.0.1:3000':
        return REDIRECT_127, 'http://127.0.0.1:3000'
    return REDIRECT_127, FRONTEND_URL.rstrip('/')


def get_flow(redirect_uri: str):
    return Flow.from_client_secrets_file(
        'credentials.json',
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )


@app.route('/auth/url')
def auth_url():
    redirect_uri, frontend = _redirect_uri_and_frontend_for_request()
    session['oauth_redirect_uri'] = redirect_uri
    session['frontend_origin'] = frontend
    flow = get_flow(redirect_uri)
    url, state = flow.authorization_url(access_type='offline')
    session['state'] = state
    return jsonify({'url': url})

# TEMPORARY - delete before connecting React
@app.route('/test-add-event')
def test_add_event():
    if 'token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify({'token_exists': True, 'token': session['token']})

@app.route('/oauth/callback')
def callback():
    try:
        redirect_uri = session.get('oauth_redirect_uri') or REDIRECT_127
        flow = get_flow(redirect_uri)
        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials
        session['token'] = credentials.token
        session['refresh_token'] = credentials.refresh_token
        front = session.get('frontend_origin') or FRONTEND_URL.rstrip('/')
        return redirect(f'{front}/dashboard')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/test-create-event')
def test_create_event():
    if 'token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    creds = Credentials(
        token=session['token'],
        refresh_token=session['refresh_token'],
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.getenv('GOOGLE_CLIENT_ID'),
        client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    )

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

    created_event = service.events().insert(
        calendarId='primary',
        body=event
    ).execute()

    return jsonify({'success': True, 'link': created_event.get('htmlLink')})

@app.route('/add-event', methods=['POST'])
def add_event():
    if 'token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    from google.oauth2.credentials import Credentials
    creds = Credentials(
        token=session['token'],
        refresh_token = session['refresh_token'],
        token_uri = 'https://oauth2.googleapis.com/token',
        client_id = os.getenv('GOOGLE_CLIENT_ID'),
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET'),
    )

    service = build('calendar', 'v3', credentials=creds)
    data = request.get_json()
    event = {
        'summary': data.get('title', 'New event'),
        'description': data.get('description', ''),
        'start': {
            'dateTime' : data.get('start') + ':00',
            'timeZone' : 'America/Los_Angeles',
        },
        'end': {
            'dateTime' : data.get('end')+':00',
            'timeZone' : 'America/Los_Angeles',
        },
    }
    created_event = service.events().insert(
        calendarId='primary',
        body=event
    ).execute()
    return jsonify({'sucess': True, 'link': created_event.get('htmlLink')})
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=API_PORT)