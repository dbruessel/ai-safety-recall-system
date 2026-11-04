import os
import time
import requests

from dotenv import load_dotenv

# Load variables from backend/.env into environment
load_dotenv()

# 1. Credentials from .env
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ygbniurcvparmwfaqrtg.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MILLIONVERIFIER_API_KEY = os.getenv("MILLIONVERIFIER_API_KEY")
INSTANTLY_API_KEY = os.getenv("INSTANTLY_API_KEY")

# 2. Target Campaign IDs
CAMPAIGN_FLEET = "0a1d7fef-9ad5-4b2f-983e-866e04dea218"
CAMPAIGN_BROKER = "9ae676a7-a882-4ac5-92b0-12b24b2974d9"

# Supabase REST Headers (bypasses RLS using service role)
SUPA_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def push_lead_to_instantly(campaign_id: str, email: str, first_name: str, last_name: str, company: str, custom_vars: dict):
    url = "https://api.instantly.ai/api/v2/leads/add"
    headers = {
        "Authorization": f"Bearer {INSTANTLY_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "campaign_id": campaign_id,
        "skip_if_in_workspace": True,
        "leads": [{
            "email": email.strip(),
            "first_name": first_name or "",
            "last_name": last_name or "",
            "company_name": company or "",
            "custom_variables": custom_vars
        }]
    }
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=15)
        return res.status_code in [200, 201]
    except Exception as e:
        print(f"    Instantly POST error: {e}")
        return False

def process_cohorts():
    print("--- 1. Pushing Verified Fleets to Instantly ---")
    fleet_query_url = (
        f"{SUPABASE_URL}/rest/v1/leads?"
        "lead_type=eq.fleet_owner&mv_result=eq.ok&pushed_to_instantly=eq.false&limit=100"
    )
    res = requests.get(fleet_query_url, headers=SUPA_HEADERS, timeout=15)
    
    if res.status_code != 200:
        print(f"Error fetching fleets ({res.status_code}): {res.text}")
        return

    fleets = res.json()
    print(f"Found {len(fleets)} unpushed verified fleet leads.")

    for lead in fleets:
        email = lead.get("email")
        if not email:
            continue

        custom_vars = {
            "id": lead["id"],
            "job_title": lead.get("job_title") or "Fleet Manager",
            "phone": lead.get("phone") or "",
            "city": lead.get("city") or "Las Vegas",
            "state": lead.get("state") or "NV",
            "lead_type": "fleet_owner"
        }
        
        company = lead.get("company_name") or "Fleet Operator"
        success = push_lead_to_instantly(
            CAMPAIGN_FLEET, email, lead.get("first_name"), lead.get("last_name"),
            company, custom_vars
        )
        
        if success:
            patch_url = f"{SUPABASE_URL}/rest/v1/leads?id=eq.{lead['id']}"
            requests.patch(patch_url, json={
                "pushed_to_instantly": True,
                "instantly_campaign_id": CAMPAIGN_FLEET,
                "campaign_status": "active"
            }, headers=SUPA_HEADERS, timeout=10)
            print(f"  [✓ Fleet Synced]: {email} ({company})")
        else:
            print(f"  [✗ Fleet Push Failed]: {email}")
        
        time.sleep(0.2)

    print("\n--- 2. Verifying & Pushing Commercial Brokers ---")
    broker_query_url = (
        f"{SUPABASE_URL}/rest/v1/leads?"
        "lead_type=eq.commercial_broker&mv_result=is.null&email=not.is.null&limit=50"
    )
    res = requests.get(broker_query_url, headers=SUPA_HEADERS, timeout=15)
    
    if res.status_code != 200:
        print(f"Error fetching brokers ({res.status_code}): {res.text}")
        return

    brokers = res.json()
    print(f"Found {len(brokers)} unverified commercial brokers.")

    for lead in brokers:
        email = lead.get("email", "").strip()
        if not email:
            continue

        # MillionVerifier Check
        mv_url = f"https://api.millionverifier.com/api/v3/?api={MILLIONVERIFIER_API_KEY}&email={email}&timeout=10"
        try:
            mv_res = requests.get(mv_url, timeout=12).json()
            mv_status = mv_res.get("result", "error")
            mv_score = str(mv_res.get("quality") or mv_res.get("credits") or "")
        except Exception:
            mv_status = "error"
            mv_score = ""

        # Update verification in Supabase
        patch_url = f"{SUPABASE_URL}/rest/v1/leads?id=eq.{lead['id']}"
        requests.patch(patch_url, json={
            "mv_result": mv_status,
            "mv_score": mv_score,
            "health_status": "verified" if mv_status == "ok" else "do_not_contact"
        }, headers=SUPA_HEADERS, timeout=10)

        company = lead.get("company_name") or "Commercial Broker"

        # Push to Instantly Broker Campaign if OK
        if mv_status == "ok":
            custom_vars = {
                "id": lead["id"],
                "job_title": lead.get("job_title") or "Commercial Broker",
                "phone": lead.get("phone") or "",
                "city": lead.get("city") or "Las Vegas",
                "state": lead.get("state") or "NV",
                "lead_type": "commercial_broker"
            }
            success = push_lead_to_instantly(
                CAMPAIGN_BROKER, email, lead.get("first_name"), lead.get("last_name"),
                company, custom_vars
            )
            if success:
                requests.patch(patch_url, json={
                    "pushed_to_instantly": True,
                    "instantly_campaign_id": CAMPAIGN_BROKER,
                    "campaign_status": "active"
                }, headers=SUPA_HEADERS, timeout=10)
                print(f"  [✓ Broker Valid & Synced]: {email} ({company})")
            else:
                print(f"  [✗ Broker Push Failed]: {email}")
        else:
            print(f"  [✗ Excluded ({mv_status})]: {email} ({company})")

        time.sleep(0.25)

    print("\n--- Cohort Processing Finished ---")

if __name__ == "__main__":
    process_cohorts()