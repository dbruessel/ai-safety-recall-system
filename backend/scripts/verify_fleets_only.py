import os
import requests
import time
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
MILLIONVERIFIER_API_KEY = os.getenv("MILLIONVERIFIER_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def verify_email(email):
    """Verifies a single email using MillionVerifier."""
    if not email or "@" not in email:
        return "invalid", 0

    url = f"https://api.millionverifier.com/api/v3/single?api_key={MILLIONVERIFIER_API_KEY}&email={email}"
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            return data.get("result", "unknown").lower(), data.get("quality_score", 0)
    except Exception as e:
        print(f"    ⏳ Timeout/Error checking {email}: {e}")
    
    return "error", 0


def process_fleet_verifications():
    print("================ STARTING FLEET-ONLY ENRICHMENT & VERIFICATION ================")
    
    # Target ONLY fleet_owner type leads that are pending
    res = supabase.table("leads") \
        .select("*") \
        .eq("type", "fleet_owner") \
        .eq("qc_status", "pending") \
        .execute()

    fleets = res.data
    print(f"Loaded {len(fleets)} FLEET leads ready for MillionVerifier scrubbing.\n")

    if not fleets:
        print("No pending fleet leads found.")
        return

    verified_count = 0
    rejected_count = 0

    for idx, lead in enumerate(fleets, start=1):
        lead_id = lead["id"]
        company = lead.get("company_name", "Unknown Fleet")
        email = lead.get("email")

        print(f"[{idx}/{len(fleets)}] {company} | Inbox: {email}")

        if not email:
            supabase.table("leads").update({"qc_status": "rejected"}).eq("id", lead_id).execute()
            rejected_count += 1
            continue

        mv_result, mv_score = verify_email(email)

        # Accept deliverable 'ok' or high-scoring catch_all
        if mv_result == "ok" or (mv_result == "catch_all" and mv_score >= 70):
            supabase.table("leads").update({
                "qc_status": "human_review",  # STAGED SAFELY FOR REVIEW
                "mv_result": mv_result,
                "mv_score": mv_score
            }).eq("id", lead_id).execute()

            verified_count += 1
            print(f"  ✓ STAGED FOR HUMAN REVIEW: {email} (Score: {mv_score})\n")
        else:
            supabase.table("leads").update({
                "qc_status": "rejected",
                "mv_result": mv_result,
                "mv_score": mv_score
            }).eq("id", lead_id).execute()

            rejected_count += 1
            print(f"  ✗ REJECTED: {email} ({mv_result})\n")

        # Brief rate limit pause to protect MillionVerifier quota
        time.sleep(0.2)

    print(f"\n================ FINISHED ================")
    print(f"Total Staged for Review: {verified_count}")
    print(f"Total Rejected: {rejected_count}")


if __name__ == "__main__":
    process_fleet_verifications()