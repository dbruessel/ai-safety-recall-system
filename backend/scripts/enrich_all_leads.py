import os
import re
import time
import requests
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
MILLIONVERIFIER_API_KEY = os.environ.get("MILLIONVERIFIER_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def verify_email_millionverifier(email):
    """Pings MillionVerifier with a strict 3-second timeout."""
    if not MILLIONVERIFIER_API_KEY or "your_actual" in MILLIONVERIFIER_API_KEY:
        return "unverified", {}
    
    url = f"https://api.millionverifier.com/api/v3/?api={MILLIONVERIFIER_API_KEY}&email={email}"
    try:
        res = requests.get(url, timeout=3).json()
        result = res.get("result", "unknown")
        return result, res
    except requests.exceptions.Timeout:
        print(f"  ⏳ Timeout on {email} - skipping candidate.")
        return "timeout", {}
    except Exception as e:
        return "error", {}

def normalize_company(name):
    if not name or pd.isna(name):
        return ""
    name = str(name).upper()
    for drop in ["LLC", "INC", "CORP", "CORPORATION", "GROUP", "AGENCY", "INSURANCE", "SERVICES", "NV", "LAS VEGAS", "CO", "COMPANY"]:
        name = re.sub(r'\b' + drop + r'\b', '', name)
    return re.sub(r'[^A-Z0-9]', '', name).strip()

def enrich_brokers_and_verify():
    print("=== STEP 1: Matching Domains from Sircon Master Sheet ===")
    sircon_url = "https://docs.google.com/spreadsheets/d/1Gv4IxaeNNcmTZaxhhd65E3ND7Q12SkRJxlnp0L2KIsU/export?format=csv"
    
    domain_map = {}
    try:
        df_sircon = pd.read_csv(sircon_url, storage_options={'User-Agent': 'Mozilla/5.0'})
        print(f"Read {len(df_sircon)} rows from Sircon Google Sheet.")
        
        for _, row in df_sircon.iterrows():
            c_name = str(row.get('Name', '')).strip()
            c_email = str(row.get('Email', '')).strip().lower()
            if c_name and "@" in c_email and "nan" not in c_email:
                dom = c_email.split("@")[-1].strip()
                domain_map[normalize_company(c_name)] = {"domain": dom, "fallback_email": c_email}
                
        print(f"Mapped {len(domain_map)} domains from Sircon Sheet.")
    except Exception as e:
        print(f"Error fetching Sircon sheet: {e}")

    # Fetch Pending Brokers from Supabase
    res = supabase.table("leads").select("*").eq("type", "broker").eq("qc_status", "pending").execute()
    brokers = res.data
    print(f"Processing {len(brokers)} pending brokers in Supabase...\n")

    print("=== STEP 2: Running MillionVerifier Pattern Pings ===")
    
    verified_count = 0
    rejected_count = 0

    for idx, broker in enumerate(brokers, start=1):
        cname_norm = normalize_company(broker.get("company_name", ""))
        s_match = domain_map.get(cname_norm, {})
        
        domain = broker.get("domain") or s_match.get("domain")
        first = broker.get("first_name")
        last = broker.get("last_name")
        existing_email = broker.get("email") or s_match.get("fallback_email")

        # Build Candidate Emails
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

        if existing_email and "@" in existing_email:
            candidates.append(existing_email)

        candidates = list(dict.fromkeys(candidates))

        if not candidates:
            supabase.table("leads").update({"qc_status": "rejected"}).eq("id", broker["id"]).execute()
            rejected_count += 1
            continue

        # Verify Candidates with MillionVerifier
        valid_email = None
        for candidate in candidates:
            result, _ = verify_email_millionverifier(candidate)
            time.sleep(0.1) # Throttling to keep API connection stable
            
            if result == "ok":
                valid_email = candidate
                break

        if valid_email:
            supabase.table("leads").update({
                "email": valid_email,
                "domain": valid_email.split("@")[-1],
                "qc_status": "approved"
            }).eq("id", broker["id"]).execute()
            verified_count += 1
            print(f"  ✓ [{verified_count}] Approved: {valid_email} ({broker['company_name']})")
        else:
            supabase.table("leads").update({"qc_status": "rejected"}).eq("id", broker["id"]).execute()
            rejected_count += 1

        if idx % 50 == 0:
            print(f"\n--- Progress: {idx}/{len(brokers)} processed ({verified_count} Approved, {rejected_count} Rejected) ---\n")

    print(f"\n✓ Completed! {verified_count} emails approved, {rejected_count} rejected.")

if __name__ == "__main__":
    enrich_brokers_and_verify()