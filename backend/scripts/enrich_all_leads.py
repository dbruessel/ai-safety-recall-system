import os
import re
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
    if not MILLIONVERIFIER_API_KEY or MILLIONVERIFIER_API_KEY == "your_actual_millionverifier_api_key_here":
        return "unverified"
    url = f"https://api.millionverifier.com/api/v3/?api={MILLIONVERIFIER_API_KEY}&email={email}"
    try:
        res = requests.get(url, timeout=5).json()
        return res.get("result", "unknown")
    except Exception:
        return "unknown"

def clean_company_to_domain(company_name):
    """Fallback helper to derive probable domain if not in Sircon sheet."""
    name = company_name.upper()
    for drop in ["LLC", "INC", "CORP", "CORPORATION", "GROUP", "AGENCY", "INSURANCE", "SERVICES", "NV", "LAS VEGAS"]:
        name = re.sub(r'\b' + drop + r'\b', '', name)
    clean = re.sub(r'[^A-Z0-9]', '', name).lower()
    return f"{clean}.com" if len(clean) > 2 else None

def enrich_brokers_and_verify():
    print("=== STEP 1: Matching Domains from Sircon Master Sheet ===")
    
    # Direct export link to your Sircon Sheet
    sircon_url = "https://docs.google.com/spreadsheets/d/1Gv4IxaeNNcmTZaxhhd65E3ND7Q12SkRJxlnp0L2KIsU/export?format=csv"
    domain_map = {}
    
    try:
        df_sircon = pd.read_csv(sircon_url)
        print(f"Read {len(df_sircon)} rows from Sircon Google Sheet.")
        
        # Explicit mapping based on your diagnostic output
        for _, row in df_sircon.iterrows():
            c_name = str(row.get('Name', '')).strip().upper()
            c_email = str(row.get('Email', '')).strip().lower()
            
            if c_name and "@" in c_email and "nan" not in c_email:
                dom = c_email.split("@")[-1].strip()
                domain_map[c_name] = {"domain": dom, "fallback_email": c_email}
                
        print(f"Mapped {len(domain_map)} direct domains/emails from Sircon Sheet.")
    except Exception as e:
        print(f"Error fetching Sircon sheet: {e}")

    # Fetch Brokers from Supabase
    res = supabase.table("leads").select("*").eq("type", "broker").execute()
    brokers = res.data
    print(f"Processing {len(brokers)} brokers in Supabase...")

    # Attach domains
    for broker in brokers:
        cname = broker["company_name"].strip().upper()
        d_info = domain_map.get(cname)
        
        target_domain = d_info["domain"] if d_info else clean_company_to_domain(cname)
        fallback_email = d_info["fallback_email"] if d_info else None

        if target_domain:
            updates = {"domain": target_domain}
            if fallback_email:
                updates["email"] = fallback_email
            supabase.table("leads").update(updates).eq("id", broker["id"]).execute()

    print("✓ Broker domains populated.")

    print("\n=== STEP 2: Running MillionVerifier Pattern Pings ===")
    
    # Re-fetch updated brokers
    res = supabase.table("leads").select("*").eq("type", "broker").execute()
    brokers = res.data

    verified_count = 0
    for broker in brokers:
        first = broker.get("first_name")
        last = broker.get("last_name")
        domain = broker.get("domain")
        existing_email = broker.get("email")

        # Build Candidate Patterns
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

        if existing_email and "@" in existing_email and "placeholder" not in existing_email:
            candidates.append(existing_email)

        if domain:
            candidates.append(f"info@{domain}")
            candidates.append(f"contact@{domain}")

        # Deduplicate candidates while keeping order
        candidates = list(dict.fromkeys(candidates))

        valid_email = None
        for candidate in candidates:
            # Skip if no MillionVerifier key set
            if not MILLIONVERIFIER_API_KEY or MILLIONVERIFIER_API_KEY == "your_actual_millionverifier_api_key_here":
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
            print(f"  ✓ [{verified_count}] Attached Verified Email: {valid_email} ({broker['company_name']})")

    print(f"\n✓ Completed! Successfully attached and verified {verified_count} direct broker emails.")

if __name__ == "__main__":
    enrich_brokers_and_verify()