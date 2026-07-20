from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import init_vertex, get_settings

# Explicitly import all system and newly created feature routers
from app.routers import (
    metrics,
    batches,
    vins,
    upload,
    recalls,
    webhook_router,
    dashboard_router,  # Live interactive fleet/task management
    sandbox,
    payment_router     # Unified Stripe subscriptions & webhooks
)

# Initialize Vertex AI as required by the backend configuration
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

    # Configure CORS middleware to support local development server origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # For production, limit this to settings.FRONTEND_ORIGIN
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # =====================================================================
    # CENTRAL ROUTER REGISTRY (UNIFIED UNDER /api PREFIX)
    # =====================================================================
    
    # 1. Core Platform & Telemetry Routers
    app.include_router(metrics.router, prefix="/api")
    app.include_router(batches.router, prefix="/api")
    app.include_router(vins.router, prefix="/api")
    app.include_router(upload.router, prefix="/api")
    app.include_router(recalls.router, prefix="/api")
    
    # 2. Interactive Fleet & Safety Task Board Router (Fixed: Synchronized to Frontend Calls)
    app.include_router(dashboard_router.router, prefix="/api")
    
    # 3. SaaS Monetization & Automated Checkout Router (Fixed: Synchronized to Stripe Forms)
    app.include_router(payment_router.router, prefix="/api")
    
    # 4. Sandbox Testing Controls
    app.include_router(sandbox.router, prefix="/api")
    
    # 5. Standalone Webhook Listener Router (Fixed: Piped cleanly into the API lifecycle)
    app.include_router(webhook_router.router, prefix="/api")

    return app

# Instantiate the central ASGI application for Uvicorn hot-reloads
app = create_app()