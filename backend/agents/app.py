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

CORS(app, origins="http://localhost:3000", supports_credentials=True)

SCOPES = ['https://www.googleapis.com/auth/calendar.events']
REDIRECT_URI = 'http://127.0.0.1:5000/oauth/callback'

def get_flow():
    return Flow.from_client_secrets_file(
        'credentials.json',
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )

@app.route('/auth/url')
def auth_url():
    flow = get_flow()
    url, state = flow.authorization_url(access_type='offline')
    session['state'] = state
    return jsonify({ 'url': url })

# TEMPORARY - delete before connecting React
@app.route('/test-add-event')
def test_add_event():
    if 'token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify({'token_exists': True, 'token': session['token']})

@app.route('/oauth/callback')
def callback():
    try:
        flow = get_flow()
        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials
        session['token'] = credentials.token
        session['refresh_token'] = credentials.refresh_token
        return redirect('http://127.0.0.1:5000/test-add-event')
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
    app.run(debug=True, host='0.0.0.0')