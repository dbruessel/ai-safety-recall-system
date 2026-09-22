import os
import requests
from supabase import create_client, Client

# Environment Credentials
SUPABASE_URL = "https://YOUR_SUPABASE_PROJECT.supabase.co"
SUPABASE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY"
MILLIONVERIFIER_API_KEY = "YOUR_MILLIONVERIFIER_API_KEY"
INSTANTLY_API_KEY = "YOUR_INSTANTLY_API_KEY"

# Instantly Campaign IDs
BROKER_CAMPAIGN_ID = "YOUR_INSTANTLY_BROKER_CAMPAIGN_ID"
FLEET_CAMPAIGN_ID = "YOUR_INSTANTLY_FLEET_CAMPAIGN_ID"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------------------------------------------------------------
# 1. MILLIONVERIFIER INTEGRATION
# -------------------------------------------------------------------
def verify_email_millionverifier(email):
    """
    Calls MillionVerifier Single Email API.
    Returns: (result_string, quality_score, is_valid_boolean)
    Results: 'ok', 'catch_all', 'unknown', 'disposable', 'invalid'
    """
    url = f"https://api.millionverifier.com/api/v3/single?api_key={MILLIONVERIFIER_API_KEY}&email={email}"
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            result = data.get("result", "unknown").lower()
            score = data.get("quality_score", 0)
            
            # Strict verification rule: Only allow 'ok' (and optionally 'catch_all' if score > 70)
            is_valid = (result == "ok") or (result == "catch_all" and score >= 70)
            return result, score, is_valid
    except Exception as e:
        print(f"MillionVerifier API Error for {email}: {e}")
    
    return "error", 0, False

def process_pending_verifications(limit=50):
    """Fetches pending leads and runs them through MillionVerifier before approving."""
    response = supabase.table("leads") \
        .select("*") \
        .eq("qc_status", "pending") \
        .not_.is_("email", "null") \
        .limit(limit) \
        .execute()

    pending_leads = response.data
    if not pending_leads:
        print("No pending leads to verify with MillionVerifier.")
        return

    print(f"Running MillionVerifier on {len(pending_leads)} pending leads...")

    for lead in pending_leads:
        mv_result, mv_score, is_valid = verify_email_millionverifier(lead['email'])
        new_status = "approved" if is_valid else "rejected"

        supabase.table("leads").update({
            "qc_status": new_status,
            "mv_result": mv_result,
            "mv_score": mv_score
        }).eq("id", lead['id']).execute()

        print(f" Verified: {lead['email']} | MV Result: {mv_result} (Score: {mv_score}) | QC: {new_status}")

# -------------------------------------------------------------------
# 2. INSTANTLY API INTEGRATION
# -------------------------------------------------------------------
def push_to_instantly(lead):
    """Router function to push clean leads to Instantly API."""
    url = "https://api.instantly.ai/api/v1/lead/add"
    campaign_id = BROKER_CAMPAIGN_ID if lead['type'] == 'broker' else FLEET_CAMPAIGN_ID

    payload = {
        "api_key": INSTANTLY_API_KEY,
        "campaign_id": campaign_id,
        "email": lead['email'],
        "first_name": lead.get('first_name') or "",
        "last_name": lead.get('last_name') or "",
        "company_name": lead['company_name'],
        "custom_variables": {
            "Fleet Size": str(lead.get('fleet_size', 0)),
            "City": lead.get('city', 'Las Vegas'),
            "Segment": lead['type']
        }
    }

    try:
        res = requests.post(url, json=payload, timeout=10)
        return res.status_code in [200, 201]
    except Exception as e:
        print(f"Instantly API Error for {lead['email']}: {e}")
        return False

# -------------------------------------------------------------------
# 3. DAILY PIPELINE EXECUTION
# -------------------------------------------------------------------
def run_gtm_pipeline(batch_per_segment=30):
    print("--- STARTING GTM PIPELINE EXECUTION ---")
    
    # Step A: Verify Pending Emails via MillionVerifier
    process_pending_verifications(limit=100)

    # Step B: Sync Approved Leads to Instantly
    for segment in ['broker', 'fleet_owner']:
        response = supabase.table("leads") \
            .select("*") \
            .eq("type", segment) \
            .eq("qc_status", "approved") \
            .eq("pushed_to_instantly", False) \
            .limit(batch_per_segment) \
            .execute()

        approved_leads = response.data
        print(f"[{segment.upper()}] Pushing {len(approved_leads)} verified leads to Instantly...")

        for lead in approved_leads:
            if push_to_instantly(lead):
                supabase.table("leads") \
                    .update({"pushed_to_instantly": True}) \
                    .eq("id", lead['id']) \
                    .execute()
                print(f"  ✓ Synced: {lead['email']}")
            else:
                print(f"  ✗ Failed to sync: {lead['email']}")

if __name__ == "__main__":
    run_gtm_pipeline(batch_per_segment=30)