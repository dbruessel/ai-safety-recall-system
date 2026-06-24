from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # These must match your .env keys (case-insensitive in Pydantic)
    project_id: str
    frontend_origin: str
    supabase_url: str
    supabase_key: str
    supabase_service_key: str  # <--- THIS WAS MISSING
    database_url: str

    model_config = SettingsConfigDict(env_file=".env", extra='ignore')

    # This tells Pydantic where to load the environment variables
    model_config = SettingsConfigDict(env_file=".env", extra='ignore')

def get_settings():
    return Settings()

# Instantiate settings
settings = get_settings()

def init_vertex():
    """Placeholder for your Vertex AI init if still needed."""
    pass