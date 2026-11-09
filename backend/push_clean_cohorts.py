import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ygbniurcvparmwfaqrtg.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
INSTANTLY_API_KEY = os.getenv("INSTANTLY_API_KEY")

if not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing SUPABASE_SERVICE_ROLE_KEY in backend/.env")
if not INSTANTLY_API_KEY:
    raise ValueError("Missing INSTANTLY_API_KEY in backend/.env")

CAMPAIGN_FLEET = "0a1d7fef-9ad5-4b2f-983e-866e04dea218"
CAMPAIGN_BROKER = "9ae676a7-a882-4ac5-92b0-12b24b2974d9"

# Set a batch limit per run (set to None or a large number like 500 to push all staged leads at once)
BATCH_LIMIT_PER_COHORT = 500

SUPA_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def clean_email(raw_email: str) -> str:
    if not raw_email:
        return ""
    first_candidate = raw_email.replace(";", "/").replace(",", "/").split("/")[0].strip()
    cleaned = first_candidate.rstrip(".;, ")
    if "@" not in cleaned or "." not in cleaned.split("@")[-1]:
        return ""
    return cleaned

def extract_names(first_name: str, last_name: str, email: str):
    fn = (first_name or "").strip().title()
    ln = (last_name or "").strip().title()
    if fn:
        return fn, ln

    if not email or "@" not in email:
        return "", ""

    local = email.split("@")[0].lower()
    generic_inboxes = {
        "admin", "dispatch", "accounting", "accounts", "info", "ap", "contact",
        "order", "purchasing", "sales", "office", "officemngr", "truckshop",
        "fleet", "pallets", "hotshot", "truckmasterschool", "reliablecarriers",
        "inquiries", "billing", "service", "support", "help", "operations", "quote",
        "accredited", "vegatrucking", "ustransport", "gm", "josechvz"
    }
    if local in generic_inboxes:
        return "", ""

    for sep in [".", "_", "-"]:
        if sep in local:
            parts = local.split(sep)
            if len(parts) >= 2 and parts[0].isalpha() and parts[1].isalpha():
                if len(parts[0]) == 1:
                    return "", parts[1].title()
                return parts[0].title(), parts[1].title()

    common_short_names = {
        "mike", "carrie", "jennifer", "tom", "ryan", "sandra", "scott", "todd",
        "ron", "pat", "moe", "edwin", "jeff", "amber", "donnie", "ken", "chris",
        "paul", "rigo", "joe", "ray", "tyler", "debbie", "brent", "sara", "dani",
        "elisa", "jenny", "kevin", "tanya", "john", "becky", "tina", "dain", "wes",
        "natasia", "brian", "chad", "dave", "dan", "steve", "mark", "greg", "lisa"
    }

    if local.isalpha():
        if local in common_short_names:
            return local.title(), ""
        if len(local) <= 4:
            return local.title(), ""
        return "", ""

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

def sync_cohort(lead_type: str, campaign_id: str, default_title: str, default_company: str):
    query_url = (
        f"{SUPABASE_URL}/rest/v1/leads?"
        f"lead_type=eq.{lead_type}&mv_result=eq.ok&pushed_to_instantly=eq.false&limit={BATCH_LIMIT_PER_COHORT}"
    )
    res = requests.get(query_url, headers=SUPA_HEADERS, timeout=15)
    if res.status_code != 200:
        print(f"[!] Error fetching {lead_type} leads ({res.status_code}): {res.text}")
        return

    leads = res.json()
    print(f"\n[*] Found {len(leads)} verified '{lead_type}' leads ready to push...")

    pushed_count = 0
    for lead in leads:
        email = clean_email(lead.get("email"))
        if not email:
            continue

        first_name, last_name = extract_names(lead.get("first_name"), lead.get("last_name"), email)
        company = lead.get("company_name") or default_company

        custom_vars = {
            "id": lead.get("id"),
            "job_title": lead.get("job_title") or default_title,
            "phone": lead.get("phone") or "",
            "city": lead.get("city") or "Las Vegas",
            "state": lead.get("state") or "NV",
            "lead_type": lead_type
        }

        if push_lead_to_instantly(campaign_id, email, first_name, last_name, company, custom_vars):
            patch_url = f"{SUPABASE_URL}/rest/v1/leads?id=eq.{lead['id']}"
            requests.patch(patch_url, json={
                "pushed_to_instantly": True,
                "instantly_campaign_id": campaign_id
            }, headers=SUPA_HEADERS, timeout=10)
            pushed_count += 1
            name_str = f" ({first_name} {last_name})".strip() if (first_name or last_name) else " (Fallback: Blank)"
            print(f"  [? Synced {pushed_count}/{len(leads)}]: {email}{name_str} -> {company}")
        else:
            print(f"  [? Failed]: {email}")

        time.sleep(0.15)

    print(f"[?] Completed '{lead_type}': {pushed_count} synced to Instantly.")

def process_cohorts():
    print("==================================================")
    print("         SYNCING VERIFIED LEADS TO INSTANTLY      ")
    print("==================================================")
    
    # 1. Sync Fleet Cohort (379 staged)
    sync_cohort(
        lead_type="fleet_owner",
        campaign_id=CAMPAIGN_FLEET,
        default_title="Fleet Manager",
        default_company="Fleet Operator"
    )

    # 2. Sync Broker Cohort (234 staged)
    sync_cohort(
        lead_type="commercial_broker",
        campaign_id=CAMPAIGN_BROKER,
        default_title="Commercial Broker",
        default_company="Commercial Brokerage"
    )

    print("\n[?] Both campaigns have been updated.")

if __name__ == "__main__":
    process_cohorts()
