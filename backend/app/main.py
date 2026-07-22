from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import init_vertex, get_settings

# Explicitly import all system and feature routers
from app.routers import (
    metrics,
    batches,
    vins,
    upload,
    recalls,
    webhook_router,
    dashboard_router,
    sandbox,
    payment_router     # Unified Stripe subscriptions & checkout router
)

# Initialize Vertex AI before application construction if configured
init_vertex()

def create_app() -> FastAPI:
    """
    Application factory to initialize and configure the central FastAPI backend.
    """
    settings = get_settings()
    
    app = FastAPI(
        title="RecallLogic Backend",
        version="2026.4.2"
    )

    # Configure CORS middleware to support local development origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.frontend_origin if hasattr(settings, "frontend_origin") else "*",
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ==========================================
    # REGISTER ALL ROUTERS UNDER THE /api PREFIX
    # ==========================================
    app.include_router(metrics.router, prefix="/api")
    app.include_router(batches.router, prefix="/api")
    app.include_router(vins.router, prefix="/api")
    app.include_router(upload.router, prefix="/api")
    app.include_router(recalls.router, prefix="/api")
    app.include_router(webhook_router.router, prefix="/api")
    app.include_router(dashboard_router.router, prefix="/api")
    app.include_router(sandbox.router, prefix="/api")
    app.include_router(payment_router.router, prefix="/api")  # Routes /api/payments/...

    return app

# Expose app instance for Uvicorn
app = create_app()