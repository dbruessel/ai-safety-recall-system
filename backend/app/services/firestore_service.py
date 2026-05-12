from typing import Any, Dict, List, Optional

from google.cloud import firestore
from google.oauth2 import service_account

from app.config import get_settings


class FirestoreService:
    def __init__(self) -> None:
        settings = get_settings()

        if settings.google_application_credentials:
            creds = service_account.Credentials.from_service_account_file(
                settings.google_application_credentials
            )
            self.client = firestore.Client(
                project=settings.project_id,
                credentials=creds,
            )
        else:
            self.client = firestore.Client(project=settings.project_id)

        self.collection_name = "recalls"

    def create_recall(self, data: Dict[str, Any]) -> str:
        doc_ref = self.client.collection(self.collection_name).document()
        doc_ref.set(data)
        return doc_ref.id

    def get_recall(self, recall_id: str) -> Optional[Dict[str, Any]]:
        doc = self.client.collection(self.collection_name).document(recall_id).get()
        if not doc.exists:
            return None
        return {"id": doc.id, **doc.to_dict()}

    def list_recalls(self) -> List[Dict[str, Any]]:
        docs = self.client.collection(self.collection_name).stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]

    def update_recall(self, recall_id: str, data: Dict[str, Any]) -> bool:
        doc_ref = self.client.collection(self.collection_name).document(recall_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.update(data)
        return True

    def delete_recall(self, recall_id: str) -> bool:
        doc_ref = self.client.collection(self.collection_name).document(recall_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        return True
