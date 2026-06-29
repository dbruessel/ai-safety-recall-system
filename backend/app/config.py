import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine the target environment file dynamically
ENV_FILE = os.getenv("ENV_FILE_PATH", ".env")

class Settings(BaseSettings):
    # These must match your .env keys (case-insensitive in Pydantic)
    project_id: str
    frontend_origin: str
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    database_url: str

    # Read the environment parameter safely out of your .env file
    environment: str = "development"

    # Dynamic path binding to prevent directory resolution failures during testing runs
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra='ignore')


@lru_cache
def get_settings() -> Settings:
    """Cached function to prevent repeated file system I/O reads on config parameters"""
    return Settings()


# Instantiate a module-level instance of settings for older modules
settings = get_settings()


def init_vertex():
    """Placeholder for your Vertex AI init if still needed."""
    pass