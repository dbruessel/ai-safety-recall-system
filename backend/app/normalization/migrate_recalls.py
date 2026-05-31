from google.cloud import firestore
from datetime import datetime
import os
import sys

# Add the parent directory (backend/app) to Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
sys.path.append(PARENT_DIR)

from normalization import normalize_recall


db = firestore.Client()

RAW_COLLECTION = "recall_campaigns"
NORM_COLLECTION = "recalls_normalized"


def build_doc_id(norm: dict) -> str:
    make = norm["make"]
    model = norm["model"].replace("/", "-").replace(" ", "_")
    year = norm["year"]
    campaign = norm["campaign_number"]
    return f"{make}_{model}_{year}_{campaign}"


def migrate_batch(limit=None):
    raw_ref = db.collection(RAW_COLLECTION)
    norm_ref = db.collection(NORM_COLLECTION)

    query = raw_ref
    if limit:
        query = query.limit(limit)

    for raw_doc in query.stream():
        raw_data = raw_doc.to_dict()

        # Normalize the raw recall
        norm = normalize_recall(raw_data)

        # Skip incomplete records
        if not norm.get("campaign_number") or not norm.get("make") or not norm.get("model"):
            print(f"Skipping incomplete record: {raw_doc.id}")
            continue

        # Build deterministic document ID
        doc_id = build_doc_id(norm)

        # Skip if already normalized (idempotent)
        if norm_ref.document(doc_id).get().exists:
            continue

        # Add metadata
        norm["raw_id"] = raw_doc.id
        norm["ingested_at"] = datetime.utcnow().isoformat() + "Z"

        # Write normalized document
        norm_ref.document(doc_id).set(norm)
        print(f"Normalized: {doc_id}")


if __name__ == "__main__":
    # First run with a small limit to verify correctness
    # migrate_batch(limit=20)
    migrate_batch()


    # After verifying, remove limit:
    # migrate_batch()
