from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import recall_router


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title="AI Safety Recall Backend")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(recall_router.router)

    @app.get("/health")
    def health_check():
        return {"status": "ok"}

    return app


app = create_app()
