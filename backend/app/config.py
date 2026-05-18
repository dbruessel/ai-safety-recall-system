import os
from google.cloud import aiplatform

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

def init_vertex():
    aiplatform.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    project_id: str
    google_application_credentials: str | None = None
    frontend_origin: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
