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
    Generates a clean, human-readable, and deterministic Document ID.
    Forcefully strips out forward slashes from ALL fields to prevent 
    Firestore path nesting errors.
    """
    make = str(norm["make"]).strip().upper().replace("/", "-")
    model = str(norm["model"]).strip().upper().replace("/", "-").replace(" ", "_")
    year = str(norm["year"]).strip().upper().replace("/", "-")
    campaign = str(norm["campaign_number"]).strip().upper().replace("/", "-")
    
    return f"{make}_{model}_{year}_{campaign}"


def migrate_batch():
    raw_ref = db.collection(RAW_COLLECTION)
    norm_ref = db.collection(NORM_COLLECTION)

    print(f"🔄 Starting paginated production migration from '{RAW_COLLECTION}' to '{NORM_COLLECTION}'...")
    print(f"🚗 OPTION A ENFORCED: Automatically filtering out non-vehicle equipment records.")
    
    processed_count = 0
    skipped_equipment_count = 0
    batch_size = 500
    last_doc = None
    
    while True:
        # UNIVERSAL STRING MECHANISM: "__name__" tells Firestore to sort by document ID
        # natively without needing to import or reference the FieldPath class.
        query = raw_ref.order_by("__name__").limit(batch_size)
        
        if last_doc:
            query = query.start_after(last_doc)
            
        docs = list(query.stream())
        
        # If no more documents are returned, we are completely finished
        if not docs:
            break
            
        print(f"\n📦 Fetching next batch of {len(docs)} raw records...")
        
        for raw_doc in docs:
            last_doc = raw_doc # Update cursor tracker
            raw_data = raw_doc.to_dict()

            # Extract normalized lowercase variants from Firestore
            raw_make = raw_data.get("make", "UNKNOWN")
            raw_model = raw_data.get("model", "UNKNOWN")
            raw_year = raw_data.get("year", "UNKNOWN")
            raw_camp = raw_data.get("campaign_number", raw_doc.id)

            # Translation Layer for government file headers
            normalization_payload = {
                **raw_data,
                "campaign_number": raw_camp,
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

            # Execute the normalization engine
            norm = normalize_campaign(normalization_payload, raw_make, raw_model, raw_year)

            # Recovery Layer
            if norm and isinstance(norm, dict):
                if not norm.get("campaign_number") and raw_camp:
                    norm["campaign_number"] = raw_camp
                if not norm.get("make") or norm.get("make") == "UNKNOWN":
                    norm["make"] = raw_make
                if not norm.get("model") or norm.get("model") == "UNKNOWN":
                    norm["model"] = raw_model
                if not norm.get("year") or norm.get("year") == 9999 or norm.get("year") == "9999":
                    norm["year"] = raw_year

            # Filter Out Equipment / Accessories
            target_year = str(norm.get("year", "")) if norm else ""
            if target_year in ["9999", "UNKNOWN", ""]:
                skipped_equipment_count += 1
                continue

            if not norm or not norm.get("campaign_number") or not norm.get("make") or not norm.get("model"):
                continue

            doc_id = build_doc_id(norm)

            # Check if record already exists in target collection
            if norm_ref.document(doc_id).get().exists:
                continue

            # Add tracking metadata
            norm["raw_id"] = raw_doc.id
            norm["ingested_at"] = datetime.utcnow().isoformat() + "Z"

            # Commit normalized document
            norm_ref.document(doc_id).set(norm)
            processed_count += 1
            
            if processed_count % 100 == 0:
                print(f"⚡ Successfully normalized and committed {processed_count} vehicle records...")

    print("\n🏁 PRODUCTION MIGRATION COMPLETE!")
    print(f"✅ Total clean vehicle documents written: {processed_count}")
    print(f"🧹 Total standalone equipment records skipped: {skipped_equipment_count}")


if __name__ == "__main__":
    migrate_batch()