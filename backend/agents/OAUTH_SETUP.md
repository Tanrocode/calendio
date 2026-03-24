# Google OAuth — URLs to configure

Unified FastAPI runs on **port 8000** by default. Set `API_PORT` in `.env` if you use another port.

## Google Cloud Console → Credentials → OAuth client

### Authorized redirect URIs

```
http://127.0.0.1:8000/oauth/callback
http://localhost:8000/oauth/callback
```

### Web client — Authorized JavaScript origins

```
http://127.0.0.1:3000
http://localhost:3000
```

## credentials.json

Include the same **redirect_uris** (port 8000) under `installed` or `web`.

## Run (repo root)

```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Requires `FLASK_SECRET_KEY` in `backend/.env`. Place `credentials.json` in `backend/` or `backend/agents/`.
