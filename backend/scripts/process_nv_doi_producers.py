import os
import pandas as pd
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Find project root (two levels up from backend/scripts)
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
    
    # Read Excel (openpyxl engine handles .xlsx)
    df = pd.read_excel(EXCEL_PATH)
    df.columns = [str(c).strip().lower() for c in df.columns]

    print(f"Loaded {len(df)} rows from Excel. Parsing commercial producers...")

    # Identify relevant columns dynamically
    name_col = next((c for c in df.columns if "name" in c), df.columns[0])
    comp_col = next((c for c in df.columns if "agency" in c or "company" in c or "business" in c), None)
    email_col = next((c for c in df.columns if "email" in c), None)
    phone_col = next((c for c in df.columns if "phone" in c), None)
    city_col = next((c for c in df.columns if "city" in c), None)

    # Captive / personal email domains to exclude
    excluded_domains = ["gmail.com", "yahoo.com", "hotmail.com", "aol.com", "statefarm.com", "allstate.com", "farmers.com", "geico.com", "primerica.com"]

    leads_to_insert = []

    for _, row in df.iterrows():
        raw_email = str(row[email_col]).strip().lower() if email_col and pd.notna(row[email_col]) else ""
        
        if "@" not in raw_email:
            continue
            
        domain = raw_email.split("@")[-1]
        if domain in excluded_domains:
            continue

        full_name = str(row[name_col]).strip().title() if pd.notna(row[name_col]) else ""
        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        company = str(row[comp_col]).strip() if comp_col and pd.notna(row[comp_col]) else "Independent Commercial Producer"
        city = str(row[city_col]).strip().title() if city_col and pd.notna(row[city_col]) else "Las Vegas"
        phone = str(row[phone_col]).strip() if phone_col and pd.notna(row[phone_col]) else ""

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

    print(f"Filtered down to {len(leads_to_insert)} commercial producer leads.")

    if not leads_to_insert:
        print("No qualified leads found to upload.")
        return

    # Upload in batches of 100
    batch_size = 100
    uploaded = 0
    for i in range(0, len(leads_to_insert), batch_size):
        batch = leads_to_insert[i:i + batch_size]
        try:
            supabase.table("leads").insert(batch).execute()
            uploaded += len(batch)
            print(f"✓ Uploaded batch {i // batch_size + 1} ({uploaded}/{len(leads_to_insert)})")
        except Exception as e:
            print(f"Batch {i // batch_size + 1} note: {e}")

    print("✓ Nevada DOI Resident Producers successfully staged into Supabase!")

if __name__ == "__main__":
    process_producers()