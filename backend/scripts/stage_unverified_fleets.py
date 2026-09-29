import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DISALLOWED = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "sbcglobal.net", "icloud.com", "comcast.net", "msn.com"]

def stage_unverified_fleets():
    print("Fetching fleet owner records from Supabase...")
    res = supabase.table("leads").select("*").eq("type", "fleet_owner").execute()
    leads = res.data
    
    staged_count = 0
    for lead in leads:
        email = lead.get("email")
        domain = str(lead.get("domain") or "").lower().strip()
        
        # Check if lead has no email OR uses a disallowed webmail domain
        if not email or domain in DISALLOWED or not domain:
            supabase.table("leads").update({
                "qc_status": "human_review"
            }).eq("id", lead["id"]).execute()
            staged_count += 1

    print(f"\n✓ Moved {staged_count} unverified fleet leads (webmail & missing emails) to 'human_review'.")

if __name__ == "__main__":
    stage_unverified_fleets()