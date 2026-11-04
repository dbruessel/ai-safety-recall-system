import os
import time
import requests
from dotenv import load_dotenv

# Load credentials from backend/.env
load_dotenv()

# 1. Credentials from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ygbniurcvparmwfaqrtg.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MILLIONVERIFIER_API_KEY = os.getenv("MILLIONVERIFIER_API_KEY")
INSTANTLY_API_KEY = os.getenv("INSTANTLY_API_KEY")

if not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing SUPABASE_SERVICE_ROLE_KEY. Check your backend/.env file.")
if not INSTANTLY_API_KEY:
    raise ValueError("Missing INSTANTLY_API_KEY. Check your backend/.env file.")
if not MILLIONVERIFIER_API_KEY:
    raise ValueError("Missing MILLIONVERIFIER_API_KEY. Check your backend/.env file.")

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

def clean_email(raw_email: str) -> str:
    """Extracts and sanitizes the first valid email address from multi-value or malformed fields."""
    if not raw_email:
        return ""
    # Normalize delimiters (semicolons, commas, slashes) and grab the first address
    first_candidate = raw_email.replace(";", "/").replace(",", "/").split("/")[0].strip()
    # Strip any trailing punctuation (trailing periods, semicolons, whitespace)
    cleaned = first_candidate.rstrip(".;, ")
    # Basic structural check: must have @ and a dot in the domain part
    if "@" not in cleaned or "." not in cleaned.split("@")[-1]:
        return ""
    return cleaned

def extract_names(first_name: str, last_name: str, email: str):
    """
    Returns (first_name, last_name).
    If names are absent, infers first/last name from recognizable personal email formats
    while keeping generic role inboxes (dispatch@, admin@, etc.) blank for template fallbacks.
    """
    fn = (first_name or "").strip().title()
    ln = (last_name or "").strip().title()
    if fn:
        return fn, ln

    if not email or "@" not in email:
        return "", ""

    local = email.split("@")[0].lower()
    
    # Exclude generic business/role prefix accounts
    generic_inboxes = {
        "admin", "dispatch", "accounting", "accounts", "info", "ap", "contact",
        "order", "purchasing", "sales", "office", "officemngr", "truckshop",
        "fleet", "pallets", "hotshot", "truckmasterschool", "reliablecarriers",
        "inquiries", "billing", "service", "support", "help", "operations", "quote"
    }
    if local in generic_inboxes:
        return "", ""

    # Pattern: first.last or first_last or first-last (e.g., john.smith -> John, Smith)
    for sep in [".", "_", "-"]:
        if sep in local:
            parts = local.split(sep)
            if len(parts) >= 2 and parts[0].isalpha() and parts[1].isalpha():
                if len(parts[0]) >= 2 and len(parts[1]) >= 2:
                    return parts[0].title(), parts[1].title()

    # Pattern: simple standalone first name (e.g., mike, carrie, jennifer, tom, ryan)
    if local.isalpha() and 2 <= len(local) <= 12:
        return local.title(), ""

    return "", ""

def push_lead_to_instantly(campaign_id: str, email: str, first_name: str, last_name: str, company: str, custom_vars: dict):
    url = "https://api.instantly.ai/api/v2/leads/add"
    headers = {
        "Authorization": f"Bearer {INSTANTLY_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "campaign_id": campaign_id,
        "skip_if_in_workspace": False,
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
        email = clean_email(lead.get("email"))
        if not email:
            print(f"  [✗ Skipped invalid email format]: {lead.get('email')}")
            continue

        first_name, last_name = extract_names(lead.get("first_name"), lead.get("last_name"), email)

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
            CAMPAIGN_FLEET, email, first_name, last_name,
            company, custom_vars
        )
        
        if success:
            patch_url = f"{SUPABASE_URL}/rest/v1/leads?id=eq.{lead['id']}"
            requests.patch(patch_url, json={
                "pushed_to_instantly": True,
                "instantly_campaign_id": CAMPAIGN_FLEET,
                "campaign_status": "active"
            }, headers=SUPA_HEADERS, timeout=10)
            name_str = f" ({first_name} {last_name})".strip() if (first_name or last_name) else " (Role Inbox)"
            print(f"  [✓ Fleet Synced]: {email}{name_str} -> {company}")
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
        email = clean_email(lead.get("email"))
        if not email:
            print(f"  [✗ Skipped invalid broker email]: {lead.get('email')}")
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
            first_name, last_name = extract_names(lead.get("first_name"), lead.get("last_name"), email)
            custom_vars = {
                "id": lead["id"],
                "job_title": lead.get("job_title") or "Commercial Broker",
                "phone": lead.get("phone") or "",
                "city": lead.get("city") or "Las Vegas",
                "state": lead.get("state") or "NV",
                "lead_type": "commercial_broker"
            }
            success = push_lead_to_instantly(
                CAMPAIGN_BROKER, email, first_name, last_name,
                company, custom_vars
            )
            if success:
                requests.patch(patch_url, json={
                    "pushed_to_instantly": True,
                    "instantly_campaign_id": CAMPAIGN_BROKER,
                    "campaign_status": "active"
                }, headers=SUPA_HEADERS, timeout=10)
                name_str = f" ({first_name} {last_name})".strip() if (first_name or last_name) else ""
                print(f"  [✓ Broker Valid & Synced]: {email}{name_str} -> {company}")
            else:
                print(f"  [✗ Broker Push Failed]: {email}")
        else:
            print(f"  [✗ Excluded ({mv_status})]: {email} ({company})")

        time.sleep(0.25)

    print("\n--- Cohort Processing Finished ---")

if __name__ == "__main__":
    process_cohorts()