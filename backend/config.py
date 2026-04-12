import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Default: SQLite file next to this package (no Postgres required for local dev).
_BACKEND_DIR = Path(__file__).resolve().parent
_DEFAULT_SQLITE = f"sqlite:///{_BACKEND_DIR / 'calendio.db'}"


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
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")

settings = Settings()
