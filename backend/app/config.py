import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine the target environment file dynamically [cite: 40]
ENV_FILE = os.getenv("ENV_FILE_PATH", ".env")

class Settings(BaseSettings):
    # =====================================================================
    # EXISTING CORE PLATFORM FIELDS [cite: 40]
    # =====================================================================
    project_id: str
    frontend_origin: str
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    database_url: str

    # =====================================================================
    # 🔑 ADD THESE STRIPE FIELD DECLARATIONS FOR MONETIZATION [cite: 1, 7, 14]
    # =====================================================================
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    
    # Defaults to frontend_origin if FRONTEND_URL is not explicitly set in your .env [cite: 40]
    FRONTEND_URL: str = "http://localhost:5173"

    # Read the environment parameter safely out of your .env file [cite: 40]
    environment: str = "development"

    # Dynamic path binding to prevent directory resolution failures during testing runs [cite: 40]
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra='ignore')


@lru_cache
def get_settings() -> Settings:
    """Cached function to prevent repeated file system I/O reads on config parameters""" [cite: 40]
    return Settings()


# Instantiate a module-level instance of settings for older modules [cite: 40]
settings = get_settings()


def init_vertex():
    """Placeholder for your Vertex AI init if still needed.""" [cite: 40]
    pass