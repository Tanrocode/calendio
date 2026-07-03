import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Default: SQLite file next to this package (no Postgres required for local dev).
_BACKEND_DIR = Path(__file__).resolve().parent
_DEFAULT_SQLITE = f"sqlite:///{_BACKEND_DIR / 'calendio.db'}"


def _bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


class Settings:
    """
    App configuration using environment variables.
    """
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        _DEFAULT_SQLITE,
    )
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    AGENTPHONE_WEBHOOK_SECRET: str = os.getenv("AGENTPHONE_WEBHOOK_SECRET", "")
    AGENTPHONE_API_KEY: str = os.getenv("AGENTPHONE_API_KEY", "")

    # Where the frontend lives. Used for post-OAuth redirects and as the default
    # CORS origin. In prod this is the Netlify URL; locally it defaults to Vite.
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

    # Comma-separated list of allowed CORS origins. If unset, we build a safe
    # default from FRONTEND_URL + localhost dev URLs.
    CORS_ORIGINS_RAW: str = os.getenv("CORS_ORIGINS", "")

    # Cookies (SessionMiddleware) — must be Secure when the API is served over HTTPS.
    COOKIE_SECURE: bool = _bool("COOKIE_SECURE", False)

    @property
    def cors_origins(self) -> list[str]:
        if self.CORS_ORIGINS_RAW.strip():
            return [o.strip().rstrip("/") for o in self.CORS_ORIGINS_RAW.split(",") if o.strip()]
        # Sensible default: the configured frontend + local dev URLs
        return list(dict.fromkeys([
            self.FRONTEND_URL,
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]))


settings = Settings()
