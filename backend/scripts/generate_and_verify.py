import os
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

# -------------------------------------------------------------------
# 1. INITIALIZE ENVIRONMENT & SUPABASE CLIENT
# -------------------------------------------------------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
MILLIONVERIFIER_API_KEY = os.getenv("MILLIONVERIFIER_API_KEY")

if not SUPABASE_URL or "ygbniurcvparmwfaqrtg" not in SUPABASE_URL:
    raise ValueError("Error: SUPABASE_URL is missing or invalid in your .env file!")

if not MILLIONVERIFIER_API_KEY:
    raise ValueError("Error: MILLIONVERIFIER_API_KEY is missing in your .env file!")

def get_supabase_client():
    """Creates a fresh Supabase client connection."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

supabase = get_supabase_client()


# -------------------------------------------------------------------
# 2. MILLIONVERIFIER API INTEGRATION
# -------------------------------------------------------------------
def verify_email(email):
    """Checks an email candidate using the MillionVerifier API."""
    url = f"https://api.millionverifier.com/api/v3/single?api_key={MILLIONVERIFIER_API_KEY}&email={email}"
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            result = data.get("result", "unknown").lower()
            score = data.get("quality_score", 0)
            return result, score
    except Exception as e:
        print(f"    [API Error] {email}: {e}")
    return "error", 0


def safe_db_update(lead_id, payload):
    """Executes a Supabase update with retry logic on connection drop."""
    global supabase
    for attempt in range(3):
        try:
            supabase.table("leads").update(payload).eq("id", lead_id).execute()
            return
        except Exception as e:
            print(f"    [DB Retry {attempt+1}/3] Reconnecting to Supabase...")
            time.sleep(1)
            supabase = get_supabase_client()


# -------------------------------------------------------------------
# 3. GENERATION & VERIFICATION LOOP
# -------------------------------------------------------------------
def process_pending_leads():
    print("\n================ STARTING EMAIL ENRICHMENT & VERIFICATION ================")

    # Pull remaining leads with pending status
    response = supabase.table("leads") \
        .select("*") \
        .eq("qc_status", "pending") \
        .not_.is_("domain", "null") \
        .is_("email", "null") \
        .execute()

    leads = response.data
    if not leads:
        print("No remaining pending leads found needing verification.")
        return

    print(f"Loaded {len(leads)} remaining leads to complete.\n")

    for idx, lead in enumerate(leads, 1):
        company = lead.get("company_name", "Unknown Company")
        first = (lead.get("first_name") or "").strip().lower().replace(" ", "")
        last = (lead.get("last_name") or "").strip().lower().replace(" ", "")
        domain = lead.get("domain", "").strip().lower()

        print(f"[{idx}/{len(leads)}] {company} | Domain: {domain}")

        candidates = []
        if first and last:
            candidates.append(f"{first}.{last}@{domain}")
            candidates.append(f"{first[0]}{last}@{domain}")
            candidates.append(f"{first}{last}@{domain}")
        if first:
            candidates.append(f"{first}@{domain}")
        
        candidates.append(f"info@{domain}")
        candidates.append(f"contact@{domain}")

        verified_email = None
        final_result = "rejected"
        final_score = 0

        for candidate in candidates:
            result, score = verify_email(candidate)
            print(f"  --> Testing: {candidate} | Result: {result.upper()} (Score: {score})")

            if result == "ok" or (result == "catch_all" and score >= 70):
                verified_email = candidate
                final_result = result
                final_score = score
                break

        if verified_email:
            safe_db_update(lead["id"], {
                "email": verified_email,
                "qc_status": "approved",
                "mv_result": final_result,
                "mv_score": final_score
            })
            print(f"  ✓ APPROVED & SAVED: {verified_email}\n")
        else:
            safe_db_update(lead["id"], {
                "qc_status": "rejected",
                "mv_result": "invalid",
                "mv_score": 0
            })
            print(f"  ✗ REJECTED: No valid inbox found for {domain}\n")

    print("================ PROCESS COMPLETE ================")


if __name__ == "__main__":
    process_pending_leads()