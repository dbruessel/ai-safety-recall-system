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
