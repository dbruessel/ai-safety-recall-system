import firebase_admin
from firebase_admin import firestore, credentials

# 1. Initialize Firestore
# Ensure serviceAccountKey.json is in your root directory
# Change this line in your script
cred = credentials.Certificate(r"C:\dev\clean-repo\serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def normalize_model_data(model_val):
    """The quality gate to enforce schema string types."""
    if isinstance(model_val, list):
        return ", ".join(map(str, model_val))
    if not model_val:
        return "UNKNOWN"
    return str(model_val)

def run_dry_run():
    print("🚀 Starting Dry Run: Extracting 5 records from 'recalls_normalized'...")
    # Fetch 5 sample records
    docs = db.collection('recalls_normalized').limit(5).stream()
    
    for doc in docs:
        data = doc.to_dict()
        
        # Apply the mapping logic we defined for the new Supabase schema
        mapped_data = {
            "campaign_number": data.get("campaign_number"),
            "make": str(data.get("make", "UNKNOWN")),
            "model": normalize_model_data(data.get("model")),
            "year": str(data.get("year", "9999")),
            "component": data.get("component", "Other"),
            "summary": data.get("summary", "")[:250], # Truncating for display
        }
        
        print("\n--- Document Found ---")
        print(f"Firestore ID: {doc.id}")
        print("Mapped Data for Supabase:")
        print(mapped_data)

if __name__ == "__main__":
    run_dry_run()