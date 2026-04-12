# Calendio — Project Context

## What This Is
Calendio is a CRM voice agent platform for small businesses. Businesses embed a voice agent that handles inbound calls to **schedule appointments**, **answer FAQs**, and **capture caller info** — all hands-free. The dashboard lets business owners review call analytics (conversations had, appointments booked, conversion rates) and manage their agent configuration.

Long-term goal: generalize into a full CRM voice agent (persist caller profiles, recall past interactions for context, track lead stages).

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), TypeScript, React Router v6 |
| Backend | FastAPI (Python), SQLAlchemy ORM |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) — frontend login; Supabase JWT verification on FastAPI routes |
| Agent | LangChain (in progress — not yet wired to an LLM) |
| Calendar | Google Calendar API (OAuth, per-business credentials) |
| Voice (planned) | TTS/STT TBD — see Voice Agent section below |

---

## Repo Structure

```
backend/
  main.py              # FastAPI app, CORS, middleware
  config.py
  database.py          # SQLAlchemy engine + session
  models/              # SQLAlchemy ORM models
    appointment.py
    business.py
    conversation.py
    metric.py
    user.py
  schemas/             # Pydantic request/response schemas
  routers/
    auth.py            # Supabase JWT verification, user upsert
    dashboard.py       # Analytics endpoints
    log_agent.py       # Conversation + appointment logging
    agent.py           # (planned) voice agent invocation endpoint
    logistics.py
  agents/
    scheduling_agent.py  # LangChain agent scaffold (intent/slot logic is stubbed — see Agent section)
  tools/
    calendar_tools.py

frontend/
  src/
    App.tsx            # Routes
    pages/
      Landing.tsx
      AuthPage.tsx     # Google OAuth sign-in via Supabase
      AuthCallback.tsx # Handles OAuth redirect → persists session → /dashboard
      Dashboard.tsx
      TestAgent.tsx
    lib/
      supabaseClient.ts  # Supabase client, authCallbackUrl(), persistAppUserFromSession()
    components/
      NavBar.tsx
```

---

## Auth Flow

1. User clicks "Continue with Google" on `/auth`
2. Supabase OAuth redirects back to `authCallbackUrl()` which returns `${origin}/auth/callback`
3. `AuthCallback.tsx` calls `supabase.auth.getSession()`, persists user to `localStorage`, navigates to `/dashboard`
4. FastAPI routes verify the Supabase JWT passed as `Authorization: Bearer <token>`
5. **Route must match:** `App.tsx` route path and `authCallbackUrl()` must both be `/auth/callback`. Supabase dashboard → Auth → Redirect URLs must also include this URL.

---

## Agent Architecture (Current / In Progress)

`SchedulingAgent` in `agents/scheduling_agent.py` is a scaffold — **not connected to a real LLM yet**:
- Intent detection: keyword-based (`"book" in message`)
- Slot filling: hardcoded placeholder values
- Google Calendar tools (`check_availability`, `create_appointment`) are implemented and functional
- Context vars (`_OAUTH_SESSION_CTX`, `_BUSINESS_CTX`) pass per-request Google credentials to tools — keep this pattern for thread safety
- `AgentOutputParser` and LangChain agent wiring are TODOs

**Next steps for agent:**
- Initialize a LangChain LLM (e.g. `ChatOpenAI` or `ChatAnthropic`) inside `SchedulingAgent.__init__`
- Build a ReAct or function-calling agent with the existing tools
- Replace keyword intent logic with LLM-driven slot extraction
- Add tools for CRM features (get/update caller profile)

---

## Voice Agent Plan

**Constraint:** No Twilio budget yet. Use browser-based / free alternatives for testing.

**Recommended free-to-test approach:**
- **Web Speech API** (zero cost, Chrome built-in) — `SpeechRecognition` for STT, `SpeechSynthesis` for TTS. Good enough for demos and local testing.
- Or **Deepgram** (free tier: 45h/month STT) + **ElevenLabs** (free tier TTS) over a WebSocket for better audio quality.
- Wire audio through a FastAPI WebSocket endpoint → LangChain agent → TTS response streamed back.
- When ready for real phone calls: **Vapi.ai** (voice agent platform with built-in LLM/TTS/STT, cheaper entry point than raw Twilio).

**Target WebSocket flow:**
```
Browser mic → WebSocket → FastAPI → STT → LangChain agent → TTS → WebSocket → Browser speaker
```

---

## CRM Features Planned

- **Caller profile storage:** On each call, extract caller name, phone, email, intent → upsert into a `contacts` table keyed by phone number
- **Conversation memory:** Summarize past calls and inject as context into agent system prompt for returning callers
- **Lead stage tracking:** ENUM field on contact (lead → prospect → customer) updated by agent based on call outcome
- **Follow-up scheduling:** Agent can schedule a callback appointment when it can't resolve a request

---

## Key Design Decisions

- **No session cookies for user auth.** Frontend sends Supabase JWT as Bearer token; FastAPI validates via Supabase JWKS. `SessionMiddleware` is only for per-business Google Calendar OAuth tokens — not user auth.
- **Per-business Google Calendar OAuth.** Each business connects their own calendar; tokens stored in DB and injected via context vars at request time.
- **SQLAlchemy + Supabase Postgres.** SQLAlchemy ORM for all DB queries; Supabase is the Postgres host. Don't use the Supabase Python client for queries.
- **Naive datetimes in DB.** `start_time`/`end_time` stored as naive UTC. Timezone conversion happens at the API layer via `zoneinfo`.

---

## Environment Variables

**Backend (`backend/.env`):**
```
FLASK_SECRET_KEY=             # Starlette SessionMiddleware secret (legacy name, still required)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=                 # Supabase Postgres connection string
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=    # For server-side JWT verification
```

**Frontend (`frontend/.env.local`):**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Running Locally

```bash
# Backend (port 8000)
cd backend && uvicorn main:app --reload --port 8000

# Frontend (port 3000)
cd frontend && npm run dev
```
