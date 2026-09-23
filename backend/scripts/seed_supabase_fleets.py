import os
import glob
import pandas as pd
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Locate project root directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

def find_fmcsa_file():
    search_path = os.path.join(BASE_DIR, "data", "raw", "*Census*.csv")
    matches = glob.glob(search_path)
    return matches[0] if matches else None

def seed_fleets(power_units_min=3):
    fmcsa_file = find_fmcsa_file()
    if not fmcsa_file:
        print("Error: FMCSA Census CSV not found in data/raw/")
        return

    print(f"Reading FMCSA Census file: {os.path.basename(fmcsa_file)}...")

    # Las Vegas metro area city list
    lv_cities = ["LAS VEGAS", "NORTH LAS VEGAS", "HENDERSON", "SLOAN", "ENTERPRISE", "APEX"]

    fleet_leads = []
    chunk_size = 50000

    # Read in chunks to handle 1.96 GB file efficiently
    for chunk in pd.read_csv(fmcsa_file, chunksize=chunk_size, low_memory=False, dtype=str):
        # Normalize column names
        chunk.columns = [c.strip().upper() for c in chunk.columns]

        # Identify required columns
        state_col = "PHY_STATE" if "PHY_STATE" in chunk.columns else "STATE"
        city_col = "PHY_CITY" if "PHY_CITY" in chunk.columns else "CITY"
        power_col = "TOTAL_POWER_UNITS" if "TOTAL_POWER_UNITS" in chunk.columns else "POWER_UNITS"
        name_col = "LEGAL_NAME" if "LEGAL_NAME" in chunk.columns else "COMPANY_NAME"
        email_col = "EMAIL_ADDRESS" if "EMAIL_ADDRESS" in chunk.columns else "EMAIL"
        phone_col = "TELEPHONE" if "TELEPHONE" in chunk.columns else "PHONE"
        status_col = "CARRIER_STATUS" if "CARRIER_STATUS" in chunk.columns else "STATUS"

        # Apply Las Vegas metro + Active + Power Units threshold
        chunk[power_col] = pd.to_numeric(chunk[power_col], errors="coerce").fillna(0)

        filtered = chunk[
            (chunk[state_col].str.upper() == "NV") &
            (chunk[city_col].str.upper().isin(lv_cities)) &
            (chunk[power_col] >= power_units_min)
        ]

        for _, row in filtered.iterrows():
            c_name = str(row[name_col]).strip()
            if not c_name or c_name.lower() == "nan":
                continue

            raw_email = str(row.get(email_col, "")).strip().lower()
            email_val = raw_email if "@" in raw_email and raw_email != "nan" else None
            domain_val = email_val.split("@")[-1] if email_val else None

            fleet_leads.append({
                "type": "fleet_owner",
                "company_name": c_name,
                "email": email_val,
                "phone": str(row.get(phone_col, "")).strip(),
                "fleet_size": int(row[power_col]),
                "domain": domain_val,
                "city": str(row[city_col]).title(),
                "state": "NV",
                "qc_status": "pending",
                "pushed_to_instantly": False
            })

    print(f"Extracted {len(fleet_leads)} Las Vegas Metro Fleet Owners (Power Units >= {power_units_min}).")

    if not fleet_leads:
        print("No fleet leads found matching criteria.")
        return

    # Ingest in batches into Supabase
    batch_size = 100
    total_inserted = 0

    print("Uploading Fleet Owners to Supabase `public.leads`...")
    for i in range(0, len(fleet_leads), batch_size):
        batch = fleet_leads[i:i + batch_size]
        try:
            supabase.table("leads").insert(batch).execute()
            total_inserted += len(batch)
        except Exception as e:
            print(f"Batch {i // batch_size + 1} insert note: {e}")

    print(f"✓ Successfully seeded {total_inserted} Las Vegas Fleet Owners into Supabase!")

if __name__ == "__main__":
    seed_fleets(power_units_min=3)