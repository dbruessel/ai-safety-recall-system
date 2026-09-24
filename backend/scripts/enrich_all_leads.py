import os
import re
import urllib.parse
import pandas as pd
import requests
from supabase import create_client, Client

# Environment / API Credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://YOUR_SUPABASE_PROJECT.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SUPABASE_SERVICE_ROLE_KEY")
MILLIONVERIFIER_API_KEY = os.environ.get("MILLIONVERIFIER_API_KEY", "YOUR_MILLIONVERIFIER_API_KEY")

# Sircon Master Google Sheet (Domain Mapping Engine)
SHEET_ID = "1Gv4IxaeNNcmTZaxhhd65E3ND7Q12SkRJxlnp0L2KIsU"
GOOGLE_SHEET_CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"

# Generic webmail providers to exclude from domain-level candidate generation
GENERIC_DOMAINS = {
    "msn.com",
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "aol.com",
    "outlook.com",
    "comcast.net",
    "sbcglobal.net",
    "icloud.com",
}

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def verify_email_millionverifier(email):
    """
    Calls MillionVerifier Single Email API.
    Returns (is_valid, result, score).
    """
    if not email or "@" not in email:
        return False, "invalid", 0

    url = f"https://api.millionverifier.com/api/v3/single?api_key={MILLIONVERIFIER_API_KEY}&email={email}"
    try:
        res = requests.get(url, timeout=8)
        if res.status_code == 200:
            data = res.json()
            result = data.get("result", "unknown").lower()
            score = data.get("quality_score", 0)

            # Accept 'ok' or high quality 'catch_all'
            is_valid = (result == "ok") or (result == "catch_all" and score >= 70)
            return is_valid, result, score
    except Exception as e:
        print(f"    ⏳ Timeout / Error on {email} - skipping candidate.")

    return False, "error", 0


def generate_domain_from_company(company_name):
    """Generates a cleaned domain guess based on the company name."""
    clean_name = re.sub(
        r"(?i)\b(llc|inc|corp|corporation|group|agency|services|insurance)\b",
        "",
        company_name,
    )
    clean_name = re.sub(r"[^\w\s]", "", clean_name).strip().replace(" ", "")
    if clean_name:
        return f"{clean_name.lower()}.com"
    return None


def generate_email_permutations(first_name, last_name, domain):
    """Generates candidate email permutations for verification."""
    patterns = []
    if not domain:
        return patterns

    dom = domain.lower().replace("http://", "").replace("https://", "").replace("www.", "").strip("/")

    # Skip generic email domains from candidate pattern generation
    if dom in GENERIC_DOMAINS:
        return []

    if first_name and last_name:
        fn = re.sub(r"[^\w]", "", str(first_name).lower())
        ln = re.sub(r"[^\w]", "", str(last_name).lower())
        if fn and ln:
            patterns.append(f"{fn}.{ln}@{dom}")
            patterns.append(f"{fn[0]}{ln}@{dom}")
            patterns.append(f"{fn}@{dom}")

    elif first_name:
        fn = re.sub(r"[^\w]", "", str(first_name).lower())
        if fn:
            patterns.append(f"{fn}@{dom}")

    # Standard fallback agency patterns
    patterns.append(f"info@{dom}")
    patterns.append(f"contact@{dom}")

    return patterns


def enrich_brokers_and_verify():
    print("=== STEP 1: Matching Domains from Sircon Master Sheet ===")
    domain_map = {}
    try:
        df_sircon = pd.read_csv(GOOGLE_SHEET_CSV_URL)
        df_sircon.columns = [col.strip().lower() for col in df_sircon.columns]

        name_col = next((c for c in df_sircon.columns if "name" in c or "agency" in c), df_sircon.columns[0])
        email_col = next((c for c in df_sircon.columns if "email" in c or "domain" in c), None)

        if email_col:
            for _, row in df_sircon.iterrows():
                comp = str(row[name_col]).strip().upper()
                email = str(row[email_col]).strip()
                if "@" in email:
                    dom = email.split("@")[-1].lower()
                    domain_map[comp] = dom

        print(f"Read {len(df_sircon)} rows from Sircon Google Sheet.")
        print(f"Mapped {len(domain_map)} direct domains/emails from Sircon Sheet.")
    except Exception as e:
        print(f"⚠️ Could not load Sircon Sheet: {e}")

    # Fetch brokers with missing emails or pending status
    brokers = []
    try:
        res = supabase.table("leads").select("*").eq("type", "broker").neq("qc_status", "rejected").execute()
        brokers = res.data
    except Exception as e:
        print(f"❌ Connection Error accessing Supabase: {e}")
        print("Please check your SUPABASE_URL in .env and verify internet connectivity.")
        return

    print(f"Processing {len(brokers)} brokers in Supabase...")

    verified_count = 0

    for broker in brokers:
        # If already approved and email present, skip
        if broker.get("qc_status") == "approved" and broker.get("email"):
            continue

        company = str(broker.get("company_name", "")).strip().upper()
        domain = broker.get("domain")

        # Check domain map from Sircon sheet if missing
        if not domain and company in domain_map:
            domain = domain_map[company]

        # Generate domain guess if still missing
        if not domain and broker.get("company_name"):
            domain = generate_domain_from_company(broker["company_name"])

        if not domain:
            continue

        # Check if domain itself is a generic domain
        dom_clean = domain.lower().replace("http://", "").replace("https://", "").replace("www.", "").strip("/")
        if dom_clean in GENERIC_DOMAINS:
            continue

        # Generate candidate permutations
        candidates = generate_email_permutations(
            broker.get("first_name"), broker.get("last_name"), domain
        )

        verified_email = None

        for candidate in candidates:
            is_valid, mv_res, score = verify_email_millionverifier(candidate)
            if is_valid:
                verified_email = candidate
                break

        # Safely verify and update in Supabase
        if verified_email:
            try:
                # Check if email is already assigned to another lead to prevent unique key violations
                existing = (
                    supabase.table("leads")
                    .select("id")
                    .eq("email", verified_email)
                    .execute()
                )
                if existing.data and existing.data[0]["id"] != broker["id"]:
                    print(
                        f"   ⚠️ Skipping {verified_email} (already assigned to another lead)"
                    )
                    continue

                # Update Supabase lead record
                supabase.table("leads").update(
                    {
                        "email": verified_email,
                        "domain": domain,
                        "qc_status": "approved",
                    }
                ).eq("id", broker["id"]).execute()

                verified_count += 1
                print(
                    f"  ✓ [{verified_count}] Approved: {verified_email} ({broker['company_name']})"
                )
            except Exception as e:
                print(
                    f"   ⚠️ Could not assign {verified_email} to {broker['company_name']}: {e}"
                )
                continue


if __name__ == "__main__":
    enrich_brokers_and_verify()