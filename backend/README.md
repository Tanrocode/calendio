# Calendio Backend

Production-ready FastAPI backend for Calendio, a multi-tenant AI scheduling SaaS platform.

## Features
- FastAPI, SQLAlchemy, Pydantic, LangChain
- Multi-tenant Postgres (Supabase-compatible)
- Modular, extensible architecture

## Structure
- `main.py`: FastAPI app entrypoint
- `config.py`: Environment/config management
- `database.py`: DB engine/session
- `/models`: SQLAlchemy models
- `/schemas`: Pydantic schemas
- `/routers`: API endpoints
- `/agents`: LangChain-based scheduling agent
- `/tools`: Calendar tool functions

## Setup
1. Set environment variables (see `config.py`)
2. Install dependencies: `pip install -r requirements.txt`
3. Run: `uvicorn main:app --reload`

## TODO
- Integrate real Google OAuth & Calendar
- Add TTS/STT, Twilio integration
