import os
import requests
from dotenv import load_dotenv
from supabase import create_client

# Load backend/.env
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
INSTANTLY_API_KEY = os.getenv("INSTANTLY_API_KEY")
INSTANTLY_CAMPAIGN_ID = os.getenv("INSTANTLY_BROKER_CAMPAIGN_ID") or "8e99d2a6-8038-43f0-b18c-5dea242bf570"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def push_lead_v2_or_v1(email, first_name, last_name, company_name):
    # Try V2 API First
    url_v2 = "https://api.instantly.ai/api/v2/leads"
    headers_v2 = {
        "Authorization": f"Bearer {INSTANTLY_API_KEY}",
        "Content-Type": "application/json"
    }
    payload_v2 = {
        "campaign_id": INSTANTLY_CAMPAIGN_ID,
        "email": email,
        "first_name": first_name or "",
        "last_name": last_name or "",
        "company_name": company_name or "",
        "custom_variables": {
            "Broker Dashboard": f"https://recalllogic.ai/audit/detail?company={company_name or ''}"
        }
    }

    try:
        res = requests.post(url_v2, json=payload_v2, headers=headers_v2, timeout=10)
        if res.status_code in [200, 201]:
            return True, "V2 Success"
    except Exception:
        pass

    # Fallback to V1 API
    url_v1 = "https://api.instantly.ai/api/v1/lead/add"
    payload_v1 = {
        "api_key": INSTANTLY_API_KEY,
        "campaign_id": INSTANTLY_CAMPAIGN_ID,
        "email": email,
        "first_name": first_name or "",
        "last_name": last_name or "",
        "company_name": company_name or "",
        "custom_variables": {
            "Broker Dashboard": f"https://recalllogic.ai/audit/detail?company={company_name or ''}"
        }
    }

    try:
        res = requests.post(url_v1, json=payload_v1, timeout=10)
        if res.status_code in [200, 201]:
            return True, "V1 Success"
        else:
            return False, f"Status {res.status_code}: {res.text}"
    except Exception as e:
        return False, str(e)

def run_push():
    print("--- STARTING INSTANTLY PUSH FOR 48 APPROVED BROKERS ---")
    
    # Fetch all approved broker leads
    res = supabase.table("leads") \
        .select("*") \
        .eq("type", "broker") \
        .eq("qc_status", "approved") \
        .eq("pushed_to_instantly", False) \
        .execute()

    leads = res.data
    print(f"Found {len(leads)} leads ready to push.\n")

    pushed_count = 0
    for lead in leads:
        email = lead.get("email")
        cname = lead.get("company_name", "")
        fname = lead.get("first_name", "")
        lname = lead.get("last_name", "")

        print(f"Pushing: {email} ({cname})...")
        success, msg = push_lead_v2_or_v1(email, fname, lname, cname)

        if success:
            supabase.table("leads").update({
                "pushed_to_instantly": True
            }).eq("id", lead["id"]).execute()
            
            pushed_count += 1
            print(f"  ✓ [{pushed_count}/{len(leads)}] Pushed successfully ({msg})")
        else:
            print(f"  X Failed: {msg}")

    print(f"\n--- FINISHED: {pushed_count} leads live in Instantly! ---")

if __name__ == "__main__":
    run_push()