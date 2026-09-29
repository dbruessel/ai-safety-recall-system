import os
import requests
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

# Explicitly load .env from the backend directory
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
INSTANTLY_API_KEY = os.getenv("INSTANTLY_API_KEY")
FLEET_CAMPAIGN_ID = os.getenv("INSTANTLY_FLEET_CAMPAIGN_ID") or "8e99d2a6-8038-43f0-b18c-5dea242bf570"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def import_and_push():
    # Look for the downloaded file in current folder or backend/
    csv_file = "mv_fleets_results.csv"
    if not os.path.exists(csv_file) and os.path.exists(os.path.join("backend", csv_file)):
        csv_file = os.path.join("backend", csv_file)

    if not os.path.exists(csv_file):
        # Look for any recent MillionVerifier download in current folder
        downloads = [f for f in os.listdir(".") if f.endswith(".csv") and ("fleets" in f.lower() or "good" in f.lower())]
        if downloads:
            csv_file = downloads[0]
            print(f"Found file: {csv_file}")
        else:
            print("Error: Could not find 'mv_fleets_results.csv'. Make sure you placed the downloaded CSV in your project folder!")
            return

    df = pd.read_csv(csv_file)
    df.columns = [c.strip().lower() for c in df.columns]
    
    # Identify email and ID columns safely
    email_col = next((c for c in df.columns if "email" in c), "email")
    id_col = next((c for c in df.columns if "id" in c), "id")
    
    print(f"Loaded {len(df)} verified fleet leads from {csv_file}.")

    pushed_count = 0
    for _, row in df.iterrows():
        lead_id = row.get(id_col)
        email = row.get(email_col)
        company = str(row.get("company_name", "") or "")
        fname = str(row.get("first_name", "") or "")
        lname = str(row.get("last_name", "") or "")
        phone = str(row.get("phone", "") or "")

        if not email or pd.isna(email):
            continue

        # Update Supabase lead status
        if lead_id and not pd.isna(lead_id):
            supabase.table("leads").update({
                "qc_status": "approved",
                "mv_result": "ok"
            }).eq("id", lead_id).execute()

        # Push directly into Instantly via V2 API
        if INSTANTLY_API_KEY:
            url_v2 = "https://api.instantly.ai/api/v2/leads"
            headers_v2 = {"Authorization": f"Bearer {INSTANTLY_API_KEY}", "Content-Type": "application/json"}
            payload_v2 = {
                "campaign_id": FLEET_CAMPAIGN_ID,
                "email": email,
                "first_name": fname,
                "last_name": lname,
                "company_name": company,
                "phone": phone
            }
            try:
                res = requests.post(url_v2, json=payload_v2, headers=headers_v2, timeout=10)
                if res.status_code in [200, 201]:
                    if lead_id and not pd.isna(lead_id):
                        supabase.table("leads").update({"pushed_to_instantly": True}).eq("id", lead_id).execute()
                    pushed_count += 1
                    print(f"  ✓ [{pushed_count}/{len(df)}] Pushed: {email} ({company})")
                else:
                    print(f"  X Instantly Error {res.status_code}: {res.text}")
            except Exception as e:
                print(f"  X Push Exception for {email}: {e}")

    print(f"\n--- SUCCESS: {pushed_count} deliverable fleet leads pushed live into Instantly! ---")

if __name__ == "__main__":
    import_and_push()