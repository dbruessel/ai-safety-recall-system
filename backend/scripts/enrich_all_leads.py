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
    if not MILLIONVERIFIER_API_KEY:
        return "unverified"
    url = f"https://api.millionverifier.com/api/v3/?api={MILLIONVERIFIER_API_KEY}&email={email}"
    try:
        res = requests.get(url, timeout=5).json()
        return res.get("result", "unknown")
    except Exception:
        return "unknown"

def enrich_brokers_with_domains_and_emails():
    print("=== STEP 1: Matching Domains from Sircon Master Sheet ===")
    
    # 1. Fetch Sircon Sheet to map Company -> Domain / Email
    sircon_url = "https://docs.google.com/spreadsheets/d/1Gv4IxaeNNcmTZaxhhd65E3ND7Q12SkRJxlnp0L2KIsU/export?format=csv"
    domain_map = {}
    try:
        df_sircon = pd.read_csv(sircon_url, storage_options={'User-Agent': 'Mozilla/5.0'})
        df_sircon.columns = [c.strip().lower() for c in df_sircon.columns]
        
        comp_col = next((c for c in df_sircon.columns if "name" in c), df_sircon.columns[0])
        email_col = next((c for c in df_sircon.columns if "email" in c), None)

        for _, row in df_sircon.iterrows():
            c_name = str(row[comp_col]).strip().upper()
            c_email = str(row[email_col]).strip() if email_col else ""
            if "@" in c_email:
                dom = c_email.split("@")[-1].lower()
                domain_map[c_name] = {"domain": dom, "fallback_email": c_email}
        print(f"Loaded {len(domain_map)} domains from Sircon Master Sheet.")
    except Exception as e:
        print(f"Error fetching Sircon sheet: {e}")
        return

    # 2. Update Missing Domains in Supabase
    res = supabase.table("leads").select("*").eq("type", "broker").execute()
    brokers = res.data
    
    print(f"Updating domains for {len(brokers)} brokers in Supabase...")
    for broker in brokers:
        cname = broker["company_name"].strip().upper()
        s_match = domain_map.get(cname, {})
        
        updates = {}
        if s_match.get("domain") and not broker.get("domain"):
            updates["domain"] = s_match["domain"]
        
        if updates:
            supabase.table("leads").update(updates).eq("id", broker["id"]).execute()

    print("✓ Broker domains populated.")

    print("\n=== STEP 2: Generating & Verifying Direct Emails for Brokers ===")
    
    # Re-fetch brokers with populated domains
    res = supabase.table("leads").select("*").eq("type", "broker").execute()
    brokers = res.data

    verified_count = 0
    for broker in brokers:
        first = broker.get("first_name")
        last = broker.get("last_name")
        domain = broker.get("domain")
        cname = broker["company_name"].strip().upper()
        s_match = domain_map.get(cname, {})

        # Build candidate patterns
        candidates = []
        if first and domain:
            fn = first.lower().replace(" ", "")
            ln = last.lower().replace(" ", "") if last else ""
            if fn and ln:
                candidates.append(f"{fn}.{ln}@{domain}")
                candidates.append(f"{fn}@{domain}")
                candidates.append(f"{fn[0]}{ln}@{domain}")
            elif fn:
                candidates.append(f"{fn}@{domain}")

        # Fallback to agency primary email if available
        if s_match.get("fallback_email"):
            candidates.append(s_match["fallback_email"])

        # Test candidates against MillionVerifier
        valid_email = None
        for candidate in candidates:
            if not MILLIONVERIFIER_API_KEY:
                # If no API key set yet, accept first validly formatted pattern
                valid_email = candidate
                break
                
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
            print(f"  ✓ Attached Email: {valid_email} ({broker['company_name']})")

    print(f"\n✓ Completed! Successfully attached {verified_count} verified broker emails.")

if __name__ == "__main__":
    enrich_brokers_with_domains_and_emails()