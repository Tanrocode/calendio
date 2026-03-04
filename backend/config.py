import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """
    App configuration using environment variables.
    """
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://calendio:calendio@localhost:5432/calendio")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

settings = Settings()
