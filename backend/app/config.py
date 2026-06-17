import os
from google.cloud import aiplatform
from functools import lru_cache
from pydantic_settings import BaseSettings
# 1. Import Supabase
from supabase import create_client, Client

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

def init_vertex():
    aiplatform.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)

class Settings(BaseSettings):
    project_id: str
    google_application_credentials: str | None = None
    frontend_origin: str = "http://localhost:3000"
    
    # 2. Add Supabase settings
    supabase_url: str
    supabase_key: str

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()

# 3. Create the Supabase Client globally for use across the backend
settings = get_settings()
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)