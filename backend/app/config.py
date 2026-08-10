import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # System & App Settings
    PROJECT_ID: str = "ai-safety-recall-system"
    ENVIRONMENT: str = "sandbox"
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Supabase Configuration
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    # Stripe Integration Settings
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # Stripe Price IDs
    STRIPE_PRICE_STANDARD: Optional[str] = None
    STRIPE_PRICE_PRO: Optional[str] = None
    STRIPE_PRICE_ENTERPRISE: Optional[str] = None

    # Enable reading from .env file directly
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",         # Prevents errors if there are extra variables in .env
        case_sensitive=False    # Allows STRIPE_SECRET_KEY to map smoothly
    )


def get_settings() -> Settings:
    """
    Returns a cached or newly instantiated Settings instance.
    """
    return Settings()


# Global settings instance so `from app.config import settings` succeeds across all services
settings = get_settings()


def init_vertex() -> None:
    """
    Initializes Vertex AI settings or credentials if required.
    """
    pass