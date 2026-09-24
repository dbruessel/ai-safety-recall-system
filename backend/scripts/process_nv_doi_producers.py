import os
import pandas as pd
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
EXCEL_PATH = BASE_DIR / "data" / "raw" / "Resident_Producer_List_Sep-23-2026.xlsx"

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def process_producers():
    if not EXCEL_PATH.exists():
        print(f"Error: File not found at {EXCEL_PATH}")
        return

    print(f"Reading {EXCEL_PATH.name}...")
    df = pd.read_excel(EXCEL_PATH)
    df.columns = [str(c).strip().lower() for c in df.columns]

    print(f"Loaded {len(df)} rows from Excel. Parsing commercial producers...")

    # Identify relevant columns dynamically
    name_col = next((c for c in df.columns if "name" in c), df.columns[0])
    comp_col = next((c for c in df.columns if "agency" in c or "company" in c or "business" in c), None)
    email_col = next((c for c in df.columns if "email" in c), None)
    phone_col = next((c for c in df.columns if "phone" in c), None)
    city_col = next((c for c in df.columns if "city" in c), None)

    excluded_domains = ["gmail.com", "yahoo.com", "hotmail.com", "aol.com", "statefarm.com", "allstate.com", "farmers.com", "geico.com", "primerica.com"]

    # Pre-fetch existing emails from Supabase to avoid duplicate key errors
    print("Fetching existing emails from Supabase to prevent duplicates...")
    res = supabase.table("leads").select("email, company_name").execute()
    existing_emails = {r["email"].lower() for r in res.data if r.get("email")}
    existing_companies = {r["company_name"].lower() for r in res.data if r.get("company_name")}

    leads_to_insert = []
    seen_in_file_emails = set()

    for idx, row in df.iterrows():
        raw_email = str(row[email_col]).strip().lower() if email_col and pd.notna(row[email_col]) else ""
        
        if "@" not in raw_email:
            continue
            
        domain = raw_email.split("@")[-1]
        if domain in excluded_domains or raw_email in existing_emails or raw_email in seen_in_file_emails:
            continue

        full_name = str(row[name_col]).strip().title() if pd.notna(row[name_col]) else ""
        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        # Determine unique company name
        raw_company = str(row[comp_col]).strip() if comp_col and pd.notna(row[comp_col]) else ""
        if raw_company and raw_company.lower() != "nan":
            company = raw_company
        elif full_name:
            company = f"{full_name} Insurance Services"
        else:
            company = f"Commercial Producer {idx}"

        # Guarantee unique company name
        if company.lower() in existing_companies:
            company = f"{company} ({idx})"

        city = str(row[city_col]).strip().title() if city_col and pd.notna(row[city_col]) else "Las Vegas"
        phone = str(row[phone_col]).strip() if phone_col and pd.notna(row[phone_col]) else ""

        seen_in_file_emails.add(raw_email)
        existing_companies.add(company.lower())

        leads_to_insert.append({
            "type": "broker",
            "first_name": first_name,
            "last_name": last_name,
            "company_name": company,
            "email": raw_email,
            "domain": domain,
            "phone": phone,
            "city": city,
            "state": "NV",
            "qc_status": "approved",
            "pushed_to_instantly": False
        })

    print(f"Filtered down to {len(leads_to_insert)} unique, eligible commercial producer leads.")

    if not leads_to_insert:
        print("No new leads to upload.")
        return

    # Batch Insert
    batch_size = 100
    uploaded = 0
    print("Uploading to Supabase `public.leads`...")
    for i in range(0, len(leads_to_insert), batch_size):
        batch = leads_to_insert[i:i + batch_size]
        try:
            supabase.table("leads").insert(batch).execute()
            uploaded += len(batch)
            print(f"  ✓ Batch {i // batch_size + 1} uploaded ({uploaded}/{len(leads_to_insert)})")
        except Exception as e:
            print(f"  ✗ Batch {i // batch_size + 1} error: {e}")

    print(f"✓ FINISHED! Successfully staged {uploaded} Nevada DOI Commercial Producers into Supabase.")

if __name__ == "__main__":
    process_producers()