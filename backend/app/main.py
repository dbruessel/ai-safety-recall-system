from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import init_vertex, get_settings

# Explicitly import all system and newly created feature routers [cite: 2]
from app.routers import (
    metrics,
    batches,
    vins,
    upload,
    recalls,
    webhook_router,
    dashboard_router,  # 🔑 Added for live interactive fleet/task management
    sandbox,
    payment_router     # 🔑 Added for unified Stripe subscriptions & webhooks
)

# Initialize Vertex AI as required by the backend configuration [cite: 2]
init_vertex()

def create_app() -> FastAPI:
    """
    Application factory to initialize and configure the central FastAPI backend [cite: 2].
    """
    settings = get_settings()
    
    app = FastAPI(
        title="RecallLogic Backend",
        version="2026.4.2"
    )

    # Configure CORS middleware to support local development port matching [cite: 2]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # For production, limit this to settings.FRONTEND_URL
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # =====================================================================
    # CENTRAL ROUTER REGISTRY
    # =====================================================================
    
    # 1. Core Platform & Telemetry Routers [cite: 2]
    app.include_router(metrics.router, prefix="/api")
    app.include_router(batches.router, prefix="/api")
    app.include_router(vins.router, prefix="/api")
    app.include_router(upload.router, prefix="/api")
    app.include_router(recalls.router, prefix="/api")
    
    # 2. Interactive Fleet & Safety Task Board Router
    app.include_router(dashboard_router.router, prefix="/api")
    
    # 3. SaaS Monetization & Automated Checkout Router
    app.include_router(payment_router.router, prefix="/api")
    
    # 4. Sandbox Testing Controls [cite: 2]
    app.include_router(sandbox.router, prefix="/api")
    
    # 5. Standalone Webhook Listener Router [cite: 2]
    app.include_router(webhook_router.router, prefix="/api")

    return app

# Instantiate the central ASGI application for Uvicorn [cite: 2]
app = create_app()