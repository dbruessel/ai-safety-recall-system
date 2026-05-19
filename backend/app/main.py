from app.config import init_vertex

init_vertex()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

from app.routers import metrics

app.include_router(metrics.router, prefix="/api")



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


    @app.get("/health")
    def health_check():
        return {"status": "ok"}

    return app


app = create_app()
