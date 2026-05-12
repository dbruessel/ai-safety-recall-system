from typing import List, Optional

from app.models.recall_model import Recall, RecallCreate, RecallUpdate
from app.services.firestore_service import FirestoreService


class RecallService:
    def __init__(self) -> None:
        self.fs = FirestoreService()

    def create_recall(self, payload: RecallCreate) -> Recall:
        data = payload.dict()
        recall_id = self.fs.create_recall(data)
        return Recall(id=recall_id, **data)

    def get_recall(self, recall_id: str) -> Optional[Recall]:
        doc = self.fs.get_recall(recall_id)
        if not doc:
            return None
        return Recall(**doc)

    def list_recalls(self) -> List[Recall]:
        docs = self.fs.list_recalls()
        return [Recall(**d) for d in docs]

    def update_recall(self, recall_id: str, payload: RecallUpdate) -> Optional[Recall]:
        update_data = {k: v for k, v in payload.dict().items() if v is not None}
        if not update_data:
            return self.get_recall(recall_id)

        updated = self.fs.update_recall(recall_id, update_data)
        if not updated:
            return None
        return self.get_recall(recall_id)

    def delete_recall(self, recall_id: str) -> bool:
        return self.fs.delete_recall(recall_id)
