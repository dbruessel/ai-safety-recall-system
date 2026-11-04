import os
import time
import requests
from supabase import create_client, Client

# 1. API Keys & Endpoints (Reads from env or replace strings directly)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ygbniurcvparmwfaqrtg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SUPABASE_SERVICE_ROLE_KEY")
MILLIONVERIFIER_API_KEY = os.getenv("MILLIONVERIFIER_API_KEY", "YOUR_MILLIONVERIFIER_KEY")
INSTANTLY_API_KEY = os.getenv("INSTANTLY_API_KEY", "YOUR_INSTANTLY_API_KEY")

CAMPAIGN_FLEET = "0a1d7fef-9ad5-4b2f-983e-866e04dea218"
CAMPAIGN_BROKER = "9ae676a7-a882-4ac5-92b0-12b24b2974d9"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
    response = requests.post(url, json=payload, headers=headers, timeout=15)
    return response.status_code in [200, 201]

def process_cohorts():
    print("--- 1. Pushing Verified Fleets to Instantly ---")
    fleets = supabase.table("leads")\
        .select("id, email, first_name, last_name, company_name, job_title, phone, domain, city, state")\
        .eq("lead_type", "fleet_owner")\
        .eq("mv_result", "ok")\
        .eq("pushed_to_instantly", False)\
        .limit(100)\
        .execute()

    for lead in fleets.data:
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
        success = push_lead_to_instantly(
            CAMPAIGN_FLEET, email, lead.get("first_name"), lead.get("last_name"),
            lead.get("company_name") or "Fleet Operator", custom_vars
        )
        if success:
            supabase.table("leads").update({
                "pushed_to_instantly": True,
                "instantly_campaign_id": CAMPAIGN_FLEET,
                "campaign_status": "active"
            }).eq("id", lead["id"]).execute()
            print(f"  [✓ Fleet Synced]: {email}")
        time.sleep(0.2)

    print("\n--- 2. Verifying & Pushing Commercial Brokers ---")
    brokers = supabase.table("leads")\
        .select("id, email, first_name, last_name, company_name, job_title, phone, domain, city, state")\
        .eq("lead_type", "commercial_broker")\
        .is_("mv_result", "null")\
        .not_.is_("email", "null")\
        .limit(50)\
        .execute()

    for lead in brokers.data:
        email = lead.get("email", "").strip()
        if not email:
            continue

        # MillionVerifier Check
        mv_url = f"https://api.millionverifier.com/api/v3/?api={MILLIONVERIFIER_API_KEY}&email={email}&timeout=10"
        try:
            mv_res = requests.get(mv_url, timeout=12).json()
            mv_status = mv_res.get("result", "error")
        except Exception as e:
            mv_status = "error"

        # Update verification status in Supabase
        supabase.table("leads").update({
            "mv_result": mv_status,
            "mv_verified_at": "now()",
            "health_status": "verified" if mv_status == "ok" else "do_not_contact"
        }).eq("id", lead["id"]).execute()

        # If valid, push to Broker Campaign
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
                lead.get("company_name") or "Commercial Broker", custom_vars
            )
            if success:
                supabase.table("leads").update({
                    "pushed_to_instantly": True,
                    "instantly_campaign_id": CAMPAIGN_BROKER,
                    "campaign_status": "active"
                }).eq("id", lead["id"]).execute()
                print(f"  [✓ Broker Valid & Pushed]: {email}")
        else:
            print(f"  [✗ Filtered ({mv_status})]: {email}")
        
        time.sleep(0.25)

    print("\n--- Cohort Sync Complete ---")

if __name__ == "__main__":
    process_cohorts()