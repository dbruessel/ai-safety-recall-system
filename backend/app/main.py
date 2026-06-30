from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import init_vertex, get_settings

# Import your routers explicitly
from app.routers import (
    metrics, 
    batches, 
    vins, 
    upload, 
    recalls, 
    webhook_router, 
    sandbox  # Registered explicitly
)

# Initialize Vertex AI
init_vertex()

def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="RecallLogic Backend")

    # CORS Configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.frontend_origin,
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Routers
    app.include_router(metrics.router, prefix="/api", tags=["metrics"])
    app.include_router(batches.router, prefix="/api", tags=["batches"])
    app.include_router(vins.router, prefix="/api", tags=["vins"])
    app.include_router(upload.router, prefix="/api", tags=["upload"])
    app.include_router(recalls.router, prefix="/api", tags=["recalls"])
    app.include_router(webhook_router.router, prefix="/api/webhooks", tags=["webhooks"])
    
    # Explicit Sandbox Registration for the Testing Framework
    app.include_router(sandbox.router, prefix="/sandbox", tags=["sandbox"])

    @app.get("/health")
    async def health_check():
        return {"status": "healthy"}

    return app

app = create_app()