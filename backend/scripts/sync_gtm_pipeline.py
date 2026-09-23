import os
import sys
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

# Explicitly load .env from the backend directory
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
INSTANTLY_API_KEY = os.getenv("INSTANTLY_API_KEY")

INSTANTLY_BROKER_CAMPAIGN_ID = os.getenv("INSTANTLY_BROKER_CAMPAIGN_ID")
INSTANTLY_FLEET_CAMPAIGN_ID = os.getenv("INSTANTLY_FLEET_CAMPAIGN_ID")

if not SUPABASE_URL:
    print(f"Error: Could not load SUPABASE_URL. Checked path: {os.path.abspath(env_path)}")
    sys.exit(1)

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

supabase = get_supabase_client()


def safe_db_query(query_func, retries=3):
    """Executes a Supabase query with automatic retry on DNS/Connection drops."""
    global supabase
    for attempt in range(retries):
        try:
            return query_func()
        except Exception as e:
            print(f"  [Connection Retry {attempt+1}/{retries}] Reconnecting to Supabase... ({e})")
            time.sleep(2)
            supabase = get_supabase_client()
    print("Error: Could not complete database request due to persistent network failure.")
    return None


def push_lead_to_instantly(campaign_id, email, first_name, last_name, company_name, phone=None):
    """Pushes a single verified lead into an Instantly campaign."""
    if not INSTANTLY_API_KEY or not campaign_id:
        print("  [Warning] Missing INSTANTLY_API_KEY or Campaign ID in .env. Skipping API push.")
        return False

    url = "https://api.instantly.ai/api/v1/lead/add"
    payload = {
        "api_key": INSTANTLY_API_KEY,
        "campaign_id": campaign_id,
        "email": email,
        "first_name": first_name or "",
        "last_name": last_name or "",
        "company_name": company_name or "",
        "phone": phone or "",
        "skip_if_in_workspace": True
    }

    try:
        res = requests.post(url, json=payload, timeout=10)
        if res.status_code in [200, 201]:
            return True
        else:
            print(f"  [Instantly Error] Status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"  [Instantly Connection Error]: {e}")
    
    return False


def run_gtm_pipeline():
    print("\n--- STARTING GTM PIPELINE EXECUTION ---")

    # Fetch approved leads from Supabase safely
    query = lambda: supabase.table("leads") \
        .select("*") \
        .eq("qc_status", "approved") \
        .limit(100) \
        .execute()

    res = safe_db_query(query)
    if not res or not res.data:
        print("No approved leads waiting in queue for Instantly sync.")
        return

    leads = res.data
    print(f"Found {len(leads)} approved leads ready for sync.\n")

    synced_count = 0
    for lead in leads:
        lead_id = lead.get("id")
        email = lead.get("email")
        company = lead.get("company_name", "")
        first_name = lead.get("first_name", "")
        last_name = lead.get("last_name", "")
        phone = lead.get("phone", "")
        lead_type = lead.get("type", "broker")

        target_campaign = INSTANTLY_FLEET_CAMPAIGN_ID if lead_type == "fleet_owner" else INSTANTLY_BROKER_CAMPAIGN_ID

        print(f"Syncing [{lead_type.upper()}]: {email} ({company})...")

        pushed = push_lead_to_instantly(
            campaign_id=target_campaign,
            email=email,
            first_name=first_name,
            last_name=last_name,
            company_name=company,
            phone=phone
        )

        if pushed or not INSTANTLY_API_KEY:
            # Mark lead as synced in Supabase
            update_query = lambda: supabase.table("leads") \
                .update({"qc_status": "synced"}) \
                .eq("id", lead_id) \
                .execute()
            
            safe_db_query(update_query)
            synced_count += 1
            print(f"  ✓ Successfully synced and updated status to 'synced'\n")

    print(f"--- FINISHED: {synced_count} leads processed and updated in Supabase. ---")


if __name__ == "__main__":
    run_gtm_pipeline()