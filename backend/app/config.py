import os
from google.cloud import aiplatform
from functools import lru_cache
from pydantic_settings import BaseSettings
from supabase import create_client, Client

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

def init_vertex():
    aiplatform.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)

class Settings(BaseSettings):
    project_id: str
    google_application_credentials: str | None = None
    frontend_origin: str = "http://localhost:3000"
    
    # Supabase Settings for the API client (sb_publishable/anon keys)
    supabase_url: str
    supabase_key: str

    # Direct Postgres URI Connection string for SQLModel / SQLAlchemy ORM
    # Found in Supabase Dashboard -> Settings -> Database -> Connection string -> URI
    database_url: str

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()

# Instantiate globally for use across the backend layers
settings = get_settings()

# 1. PostREST HTTP API Client Client (Frontend/Auth operations)
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)