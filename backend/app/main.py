from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import init_vertex, get_settings
from app.routers import metrics, batches, vins, upload, recalls
from app.routers import webhook_router  # INJECTED: Our new Stripe webhook router namespace

# Try importing the sandbox router conditionally to safeguard production environments
try:
    from app.routers import sandbox
except ImportError:
    sandbox = None

# Initialize Vertex AI before app creation
init_vertex()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title="AI Safety Recall Backend")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.frontend_origin,      # Keeps your existing config intact
            "http://localhost:5173",       # Explicitly allows your local Vite dev server
            "http://127.0.0.1:5173"        # Covers the loopback IP variant just in case
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Health check
    @app.get("/health")
    def health_check():
        return {"status": "ok"}

    # Register routers INSIDE the app context
    app.include_router(metrics.router, prefix="/api")
    app.include_router(batches.router, prefix="/api") 
    app.include_router(vins.router, prefix="/api")
    app.include_router(upload.router, prefix="/api")
    app.include_router(recalls.router, prefix="/api")     # Exposing /api/recalls paths
    app.include_router(webhook_router.router, prefix="/api")  # INJECTED: Exposing /api/payments/webhook

    # EPIC 6 SANDBOX INTERCEPTOR:
    # If explicitly flagged in local environment variables, mount the agent testing replica control routes
    if getattr(settings, "environment", "").lower() == "sandbox" and sandbox is not None:
        app.include_router(sandbox.router, prefix="/api/sandbox", tags=["Sandbox Automation"])

    return app


# Create the FastAPI app instance
app = create_app()