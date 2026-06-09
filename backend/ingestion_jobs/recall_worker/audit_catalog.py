import requests
from google.cloud import firestore

db = firestore.Client()

def audit_and_sync_catalog():
    print("📡 Fetching official master make list from NHTSA vPIC...")
    # This fetches all registered vehicle makes
    url = "https://vpic.nhtsa.gov/api/vehicles/getallmakes?format=json"
    resp = requests.get(url, timeout=20)
    nhtsa_makes = {row["Make_Name"].strip().upper() for row in resp.json()["Results"]}
    
    print(f"✓ Found {len(nhtsa_makes)} official makes registered with NHTSA.")

    print("🔍 Fetching your current localized makes from Firestore...")
    tasks_stream = db.collection("recall_tasks").stream()
    local_makes = {t.to_dict().get("make", "").strip().upper() for t in tasks_stream}
    print(f"✓ You currently have {len(local_makes)} unique makes in your database.")

    # Find the discrepancy
    missing_makes = nhtsa_makes - local_makes
    print(f"⚠️ Blindspot Audit: You are missing {len(missing_makes)} registered makes.")

    if missing_makes:
        print("📥 Injecting missing elements into your queue...")
        for make in missing_makes:
            if not make: continue
            # Generate a clean document ID to prevent duplicates
            doc_id = f"AUDIT_SYNC_{make}_ALLMODELS"
            db.collection("recall_tasks").document(doc_id).set({
                "make": make,
                "model": "777", # Triggers our universal model query catch
                "year": "2026", # Target contemporary fleet year
                "status": "pending"
            })
        print(f"🎉 Audit complete. Added {len(missing_makes)} missing tasks to process!")
    else:
        print("🥇 Data is complete! Your catalog matches NHTSA's master registration perfectly.")

if __name__ == "__main__":
    audit_and_sync_catalog()