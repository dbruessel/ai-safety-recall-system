from typing import List

from fastapi import APIRouter, HTTPException, status

from app.models.recall_model import Recall, RecallCreate, RecallUpdate
from app.services.recall_service import RecallService

router = APIRouter(prefix="/recall", tags=["recall"])

service = RecallService()


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
