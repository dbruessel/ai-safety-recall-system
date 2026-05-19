from fastapi import APIRouter
from app.services.metrics_service import compute_global_metrics

router = APIRouter()

@router.get("/metrics/global")
def get_global_metrics():
    return {"metrics": compute_global_metrics()}
