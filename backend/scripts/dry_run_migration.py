import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from supabase import create_client

# Setup environment
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")
KEY_PATH = Path(__file__).parent / "serviceAccountKey.json"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def migration_verify():
    print("🚀 Starting Verification...")
    
    # Init Firestore
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(KEY_PATH))
        firebase_admin.initialize_app(cred)
    fs = firestore.client()
    
    # Init Supabase
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("🔍 Fetching 3 records from Firestore...")
    docs = list(fs.collection("recall_campaigns").limit(3).stream())
    print(f"   Found {len(docs)} documents.")
    
    for doc in docs:
        data = doc.to_dict()
        payload = {
            "campaign_number": data.get("campaign_number") or "UNKNOWN_CAMPAIGN",
            "make": str(data.get("make", "UNKNOWN")).upper(),
            "model": str(data.get("model", "UNKNOWN")).upper(),
            "year": int(data.get("year", 0)) if data.get("year") else 0
        }
        
        print(f"   Attempting to insert: {payload['campaign_number']}...")
        try:
            # Pushing to 'recall_results'
            response = sb.table("recall_results").insert(payload).execute()
            print(f"   ✅ Success! HTTP Status: {response.data}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    migration_verify()