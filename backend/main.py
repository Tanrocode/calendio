import os
from pathlib import Path

from dotenv import load_dotenv

# override=True so an updated .env value (e.g. rotated webhook secret) replaces
# whatever was loaded on the previous worker boot rather than being ignored.
load_dotenv(Path(__file__).resolve().parent / '.env', override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

from .config import settings
from .routers import agentphone, auth, calendar_demo, dashboard, log_agent, agent_config

_secret = os.getenv('FLASK_SECRET_KEY')
if not _secret:
    raise RuntimeError(
        "Set FLASK_SECRET_KEY (required for Google OAuth sessions)."
    )

app = FastAPI(title="Calendio API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_headers=['Content-Type', 'Authorization'],
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=_secret,
    same_site='lax',
    https_only=settings.COOKIE_SECURE,
)

app.include_router(dashboard.router)
app.include_router(log_agent.router)
app.include_router(auth.router)
app.include_router(calendar_demo.router)
app.include_router(agent_config.router)
app.include_router(agentphone.router)


@app.get("/")
def root():
    return {"message": "Calendio API is running."}


@app.get("/dashboard")
def dashboard_redirect():
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard", status_code=307)


@app.get("/healthz")
def healthz():
    return {"ok": True}
