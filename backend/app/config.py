import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # System & App Settings
    project_id: str = "ai-safety-recall-system"
    environment: str = "sandbox"
    frontend_origin: str = "http://localhost:5173"

    # Supabase Configuration
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    supabase_service_key: Optional[str] = None
    database_url: Optional[str] = None

    # Stripe Integration Settings
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    
    # Stripe Price IDs
    stripe_price_standard: Optional[str] = None
    stripe_price_pro: Optional[str] = None
    stripe_price_enterprise: Optional[str] = None

    # Uppercase Aliases for Backward Compatibility
    @property
    def PROJECT_ID(self) -> str:
        return self.project_id

    @property
    def ENVIRONMENT(self) -> str:
        return self.environment

    @property
    def FRONTEND_ORIGIN(self) -> str:
        return self.frontend_origin

    @property
    def SUPABASE_URL(self) -> Optional[str]:
        return self.supabase_url

    @property
    def SUPABASE_KEY(self) -> Optional[str]:
        return self.supabase_key

    @property
    def SUPABASE_SERVICE_KEY(self) -> Optional[str]:
        return self.supabase_service_key

    @property
    def DATABASE_URL(self) -> Optional[str]:
        return self.database_url

    @property
    def STRIPE_SECRET_KEY(self) -> Optional[str]:
        return self.stripe_secret_key

    @property
    def STRIPE_WEBHOOK_SECRET(self) -> Optional[str]:
        return self.stripe_webhook_secret

    # Enable reading from .env file directly
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",         # Prevents errors if extra variables exist in .env
        case_sensitive=False    # Maps uppercase .env variables (e.g. SUPABASE_URL) to lowercase fields
    )


def get_settings() -> Settings:
    """
    Returns a newly instantiated or cached Settings instance.
    """
    return Settings()


# Global settings singleton for services importing `settings` directly
settings = get_settings()


def init_vertex() -> None:
    """
    Initializes Vertex AI settings or credentials if required.
    """
    pass