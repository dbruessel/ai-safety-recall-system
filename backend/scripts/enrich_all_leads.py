import os
import glob
import pandas as pd
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
MILLIONVERIFIER_API_KEY = os.environ.get("MILLIONVERIFIER_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def verify_email_millionverifier(email):
    """Verifies an email address using MillionVerifier API."""
    if not MILLIONVERIFIER_API_KEY:
        return "unverified"
    url = f"https://api.millionverifier.com/api/v3/?api={MILLIONVERIFIER_API_KEY}&email={email}"
    try:
        res = requests.get(url, timeout=5).json()
        return res.get("result", "unknown") # Returns 'ok', 'bad', 'catch_all', or 'unknown'
    except Exception:
        return "unknown"

def enrich_fleets_and_brokers():
    print("=== STEP 1: Enriching Fleets with Phone & Decision Maker Names ===")
    
    # 1. Load FMCSA Census File for Phone Numbers
    census_files = glob.glob("data/raw/*Census*.csv")
    if census_files:
        print(f"Reading FMCSA Census File: {census_files[0]}...")
        df_census = pd.read_csv(census_files[0], low_memory=False, dtype=str, encoding="latin1")
        df_census.columns = [c.upper().strip() for c in df_census.columns]
        
        # Build Map: Legal Name -> Phone & Email
        fmcsa_map = {}
        for _, row in df_census.iterrows():
            lname = str(row.get("LEGAL_NAME", "")).strip().upper()
            phone = str(row.get("TELEPHONE", "")).strip()
            email = str(row.get("EMAIL_ADDRESS", "")).strip()
            if lname:
                fmcsa_map[lname] = {
                    "phone": phone if phone.lower() != "nan" else "",
                    "email": email if email.lower() != "nan" and "@" in email else ""
                }

        # Update Fleet Leads in Supabase
        res = supabase.table("leads").select("id, company_name, phone, email").eq("type", "fleet_owner").execute()
        fleet_leads = res.data
        
        print(f"Updating details for {len(fleet_leads)} Fleet Owners in Supabase...")
        for lead in fleet_leads:
            cname = lead["company_name"].strip().upper()
            match = fmcsa_map.get(cname, {})
            
            updates = {}
            if match.get("phone") and not lead.get("phone"):
                updates["phone"] = match["phone"]
            if match.get("email") and not lead.get("email"):
                updates["email"] = match["email"]
                updates["domain"] = match["email"].split("@")[-1].lower()
            
            if updates:
                supabase.table("leads").update(updates).eq("id", lead["id"]).execute()

        print("✓ Fleets enriched with Phone Numbers and Direct Emails.")

    print("\n=== STEP 2: Generating & Verifying Emails for Brokers ===")
    
    # Load Brokers missing emails but having names & domains
    res = supabase.table("leads").select("*").eq("type", "broker").is_("email", "null").execute()
    brokers = res.data
    print(f"Found {len(brokers)} brokers requiring email pattern verification...")

    verified_count = 0
    for broker in brokers:
        first = broker.get("first_name")
        last = broker.get("last_name")
        domain = broker.get("domain")
        
        if not first or not domain:
            continue
            
        fn = first.lower().replace(" ", "")
        ln = last.lower().replace(" ", "") if last else ""
        
        # Build candidate patterns
        candidates = []
        if fn and ln:
            candidates.append(f"{fn}.{ln}@{domain}")
            candidates.append(f"{fn}@{domain}")
            candidates.append(f"{fn[0]}{ln}@{domain}")
        elif fn:
            candidates.append(f"{fn}@{domain}")

        # Test candidates against MillionVerifier
        valid_email = None
        for candidate in candidates:
            result = verify_email_millionverifier(candidate)
            if result == "ok":
                valid_email = candidate
                break

        if valid_email:
            supabase.table("leads").update({
                "email": valid_email,
                "qc_status": "approved"
            }).eq("id", broker["id"]).execute()
            verified_count += 1
            print(f"  ✓ Verified Email: {valid_email}")

    print(f"\n✓ Completed! Successfully verified and attached {verified_count} direct broker emails.")

if __name__ == "__main__":
    enrich_fleets_and_brokers()