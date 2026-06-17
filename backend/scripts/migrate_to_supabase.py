import firebase_admin
from firebase_admin import firestore, credentials
from supabase import create_client
from app.config import settings

# Initialize
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()
supabase = create_client(settings.supabase_url, settings.supabase_key)

def normalize_model_data(model_val):
    """Quality gate to fix malformed Firestore data."""
    if isinstance(model_val, list):
        return ", ".join(map(str, model_val))
    if not model_val:
        return "UNKNOWN"
    return str(model_val)

def migrate_collection(firestore_col, supabase_table, mapper_func):
    print(f"Starting migration: {firestore_col} -> {supabase_table}")
    docs = db.collection(firestore_col).stream()
    
    batch = []
    count = 0
    for doc in docs:
        try:
            data = doc.to_dict()
            mapped_data = mapper_func(data)
            batch.append(mapped_data)
            
            if len(batch) >= 500:
                supabase.table(supabase_table).upsert(batch).execute()
                count += len(batch)
                print(f"Upserted {count} records into {supabase_table}...")
                batch = []
        except Exception as e:
            print(f"Error migrating doc {doc.id}: {e}")

    if batch:
        supabase.table(supabase_table).upsert(batch).execute()
    print(f"Finished {firestore_col}. Total: {count}")

# Define Mappers
def map_recall_definitions(data):
    return {
        "campaign_number": data.get("campaign_number"),
        "make": data.get("make"),
        "model": normalize_model_data(data.get("model")),
        "year": str(data.get("year")),
        "component": data.get("component"),
        "summary": data.get("summary", ""),
        "consequence": data.get("consequence", "")
    }

# Execute
if __name__ == "__main__":
    migrate_collection("recalls", "recall_definitions", map_recall_definitions)
    # Add other collections following this pattern...