import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def reset_approved_fleets():
    print("Fetching fleet leads with 'approved' status and not pushed to Instantly...")
    res = supabase.table("leads") \
        .select("id, email, company_name") \
        .eq("type", "fleet_owner") \
        .eq("qc_status", "approved") \
        .eq("pushed_to_instantly", False) \
        .execute()

    leads = res.data
    print(f"Found {len(leads)} fleet leads to reset back to 'pending'.")

    for lead in leads:
        supabase.table("leads").update({
            "qc_status": "pending"
        }).eq("id", lead["id"]).execute()

    print(f"✓ Reset {len(leads)} approved fleet leads back to 'pending'.")

if __name__ == "__main__":
    reset_approved_fleets()