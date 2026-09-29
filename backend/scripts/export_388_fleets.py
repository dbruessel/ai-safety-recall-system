import os
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DISALLOWED = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "sbcglobal.net", "icloud.com", "comcast.net", "msn.com"]

def export_fleets():
    res = supabase.table("leads").select("*").eq("type", "fleet_owner").execute()
    leads = res.data
    
    clean = []
    for lead in leads:
        email = lead.get("email")
        domain = str(lead.get("domain") or "").lower().strip()
        if email and domain and domain not in DISALLOWED:
            clean.append({
                "id": lead["id"],
                "company_name": lead.get("company_name"),
                "email": email,
                "domain": domain,
                "first_name": lead.get("first_name", ""),
                "last_name": lead.get("last_name", ""),
                "phone": lead.get("phone", "")
            })

    df = pd.DataFrame(clean)
    df.to_csv("fleets_388_for_verification.csv", index=False)
    print(f"✓ Exported {len(df)} corporate fleet records to 'fleets_388_for_verification.csv'")

if __name__ == "__main__":
    export_fleets()