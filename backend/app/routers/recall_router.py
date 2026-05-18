from typing import List

from fastapi import APIRouter, HTTPException, status

from app.models.recall_model import Recall, RecallCreate, RecallUpdate
from app.services.recall_service import RecallService
from app.services.intelligence_service import analyze_recall   # ✅ FIXED: moved to top

router = APIRouter(prefix="/recall", tags=["recall"])

service = RecallService()

# --- Existing CRUD Endpoints ---

@router.post("", response_model=Recall, status_code=status.HTTP_201_CREATED)
def create_recall(payload: RecallCreate) -> Recall:
    return service.create_recall(payload)


@router.get("/{recall_id}", response_model=Recall)
def get_recall(recall_id: str) -> Recall:
    recall = service.get_recall(recall_id)
    if not recall:
        raise HTTPException(status_code=404, detail="Recall not found")
    return recall


@router.get("/all", response_model=List[Recall])
def list_recalls() -> List[Recall]:
    return service.list_recalls()


@router.patch("/{recall_id}", response_model=Recall)
def update_recall(recall_id: str, payload: RecallUpdate) -> Recall:
    updated = service.update_recall(recall_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Recall not found")
    return updated


@router.delete("/{recall_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recall(recall_id: str) -> None:
    deleted = service.delete_recall(recall_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Recall not found")


# --- New Fleet & Safety Intelligence Endpoints ---

@router.get("/analyze/{vin}", status_code=status.HTTP_200_OK)
def analyze_vehicle_safety(vin: str):
    """
    Performs an AI-driven safety analysis on a specific VIN.
    Includes the priority scoring logic tailored for fleet risk.
    """
    analysis = service.analyze_vin_safety(vin)
    if not analysis:
        raise HTTPException(status_code=404, detail="VIN data unavailable")
    return analysis


@router.post("/batch-audit", status_code=status.HTTP_200_OK)
def perform_fleet_audit(vins: List[str]):
    """
    The 'Ghost Audit' endpoint.
    Processes multiple VINs to generate a fleet-wide health report.
    """
    if not vins:
        raise HTTPException(status_code=400, detail="VIN list cannot be empty")

    audit_results = []
    for vin in vins:
        analysis = service.analyze_vin_safety(vin)
        audit_results.append(analysis)

    critical_count = sum(1 for r in audit_results if r.get("priority") == "CRITICAL")

    return {
        "summary": {
            "total_scanned": len(vins),
            "critical_risks_detected": critical_count,
            "fleet_safety_score": max(0, 100 - (critical_count * 5))
        },
        "detailed_results": audit_results
    }


# --- AI Recall Intelligence Endpoint (Gemini) ---

@router.post("/analyze/{recall_id}", response_model=Recall)
def analyze_recall_endpoint(recall_id: str):
    """
    Runs Gemini AI analysis on a recall and updates Firestore
    with ai_summary, risk_level, imminent_risk_score, and explainable_message.
    """
    recall = service.get_recall(recall_id)
    if not recall:
        raise HTTPException(status_code=404, detail="Recall not found")
