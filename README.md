# Calendio

A CRM voice agent platform for small businesses. Businesses embed a voice agent that handles inbound calls to schedule appointments, answer FAQs, and capture caller info — all hands-free. The dashboard lets owners review analytics and manage their agent configuration.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), TypeScript, React Router v6 |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) |
| Agent | LangChain + OpenAI (gpt-4o-mini) |
| Calendar | Google Calendar API |

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase project
- OpenAI API key
- Google OAuth credentials

### Environment Variables

**`backend/.env`**
```
FLASK_SECRET_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

**`frontend/.env.local`**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Running Locally

```bash
# Backend (port 8000) — run from project root
backend/.venv/bin/uvicorn backend.main:app --reload --port 8000

# Frontend (port 3000)
cd frontend && npm run dev
```
## Architecture

- **Frontend → FastAPI → Supabase** — the frontend never calls Supabase directly
- **Auth** — Supabase JWT passed as `Authorization: Bearer <token>` on every request; verified server-side via `supabase.auth.get_user()`
- **Agent** — each user configures their own agent (name, services, hours, instructions); LangChain builds a per-config system prompt and tool-calling executor backed by OpenAI
- **Google Calendar** — per-user OAuth tokens stored in session; injected into agent tools via context vars for thread safety

## Project Structure

```
backend/
  main.py                  # FastAPI app, CORS, middleware
  config.py                # Settings from environment variables
  supabase_client.py       # Shared Supabase client singleton
  supabase_auth.py         # JWT verification, CurrentUser dependency
  routers/
    auth.py                # Google OAuth routes
    dashboard.py           # Metrics endpoint
    agent_config.py        # CRUD for agent configurations
    log_agent.py           # Conversation logging + agent chat
  agents/
    scheduling_agent.py    # LangChain agent with OpenAI + Google Calendar tools

frontend/
  src/
    App.tsx
    pages/
      Landing.tsx
      AuthPage.tsx
      AuthCallback.tsx
      Dashboard.tsx         # Metrics + agent grid
      AgentPage.tsx         # Agent detail + Talk to Agent CTA
    components/
      AgentCard.tsx
      NavBar.tsx
      ProtectedRoute.tsx
    services/
      api.ts                # All backend API calls (with in-memory cache)
    lib/
      supabaseClient.ts
```
