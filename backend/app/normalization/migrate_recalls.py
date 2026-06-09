import os
import sys
import importlib.util
from datetime import datetime
from google.cloud import firestore

# -------------------------------------------------------------------------
# DIRECT PATH BYPASS: Bypassing Python's folder vs module naming collisions
# -------------------------------------------------------------------------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
target_file_path = os.path.join(CURRENT_DIR, "normalization.py")

# Force Python to load normalization.py directly from its raw file system path
spec = importlib.util.spec_from_file_location("custom_normalization_module", target_file_path)
normalization_module = importlib.util.module_from_spec(spec)
sys.modules["custom_normalization_module"] = normalization_module
spec.loader.exec_module(normalization_module)

# Extract the corrected function name discovered inside normalization.py
normalize_campaign = normalization_module.normalize_campaign

# Initialize the Firestore Client
db = firestore.Client()

# Core Data Routing Targets
RAW_COLLECTION = "recalls"
NORM_COLLECTION = "recalls_normalized"


def build_doc_id(norm: dict) -> str:
    """
    Generates a clean, human-readable, and deterministic Document ID
    to keep entries idempotent and prevent duplication.
    """
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

    print(f"🔄 Starting migration from '{RAW_COLLECTION}' to '{NORM_COLLECTION}'...")
    processed_count = 0

    for raw_doc in query.stream():
        raw_data = raw_doc.to_dict()

        # Extract normalized lowercase variants from Firestore
        raw_make = raw_data.get("make", "UNKNOWN")
        raw_model = raw_data.get("model", "UNKNOWN")
        raw_year = raw_data.get("year", "UNKNOWN")
        raw_camp = raw_data.get("campaign_number", raw_doc.id)

        # -----------------------------------------------------------------
        # TRANSLATION LAYER: Map local Firestore keys back to expected 
        # government file headers so normalization.py passes validation checkpoints.
        # -----------------------------------------------------------------
        normalization_payload = {
            **raw_data,
            "CAMPNO": raw_camp,
            "MAKETXT": raw_make,
            "MODELTXT": raw_model,
            "YEARTXT": raw_year,
            "COMPNAME": raw_data.get("component", ""),
            "DESC_DEFECT": raw_data.get("summary", ""),
            "CONSEQUENCE_DEFECT": raw_data.get("consequence", ""),
            "REMEDY_TEXT": raw_data.get("remedy", ""),
            "NOTES": raw_data.get("notes", "")
        }

        # Execute the normalization engine with its 4 required arguments
        norm = normalize_campaign(normalization_payload, raw_make, raw_model, raw_year)

        # Defend against incomplete or malformed return records
        if not norm or not norm.get("campaign_number") or not norm.get("make") or not norm.get("model"):
            print(f"⚠️ Skipping incomplete record: {raw_doc.id}")
            continue

        # Build out the uniform string layout target ID
        doc_id = build_doc_id(norm)

        # Idempotency check: Skip if this specific variant has already been processed
        if norm_ref.document(doc_id).get().exists:
            continue

        # Inject system auditing metadata
        norm["raw_id"] = raw_doc.id
        norm["ingested_at"] = datetime.utcnow().isoformat() + "Z"

        # Write the perfectly mapped model directly into production tables
        norm_ref.document(doc_id).set(norm)
        processed_count += 1
        print(f"✅ Normalized [{processed_count}]: {doc_id}")

    print(f"🏁 Migration batch finished! Successfully processed {processed_count} records.")


if __name__ == "__main__":
    # --- TESTING STAGE ---
    # First run with a small limit to ensure formatting schemas look perfect in Firestore Studio
    migrate_batch(limit=20)
    
    # --- PRODUCTION STAGE ---
    # After checking your Firestore console and confirming the layout, uncomment the line below 
    # and add a comment symbol '#' in front of migrate_batch(limit=20) above to run the whole database.
    # migrate_batch()