import os
import re
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in environment or .env file.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def seed_sircon_excel():
    # File locations check
    possible_paths = [
        "Sircon_Round2.xlsx",
        os.path.join("data", "raw", "Sircon_Round2.xlsx"),
        os.path.join("backend", "data", "Sircon_Round2.xlsx"),
    ]

    file_path = None
    for path in possible_paths:
        if os.path.exists(path):
            file_path = path
            break

    if not file_path:
        print("❌ Error: Could not locate Sircon_Round2.xlsx file.")
        return

    print(f"Reading Sircon Excel export: {file_path}...")
    df = pd.read_excel(file_path)

    # Standardize column headers
    df.columns = [str(c).strip() for c in df.columns]

    name_col = next((c for c in df.columns if "name" in c.lower()), df.columns[0])
    city_col = next((c for c in df.columns if "city" in c.lower()), None)

    exclude_pattern = r"(?i)\b(tax|smog|notary|nail|salon|bail|funeral|title|travel|clean)\b"

    broker_leads = []
    for _, row in df.iterrows():
        company = str(row[name_col]).strip()

        # Skip empty or non-commercial entities
        if not company or company.lower() == "nan" or re.search(exclude_pattern, company):
            continue

        city_raw = str(row[city_col]).strip().title() if city_col and str(row[city_col]) != "nan" else "Las Vegas"
        city_clean = "Las Vegas" if "Las Vegas" in city_raw else city_raw

        broker_leads.append({
            "type": "broker",
            "company_name": company,
            "city": city_clean,
            "state": "NV",
            "qc_status": "pending",
            "pushed_to_instantly": False
        })

    print(f"Uploading {len(broker_leads)} clean commercial agencies to Supabase...")

    inserted_count = 0
    for i in range(0, len(broker_leads), 50):
        batch = broker_leads[i : i + 50]
        try:
            supabase.table("leads").insert(batch).execute()
            inserted_count += len(batch)
        except Exception:
            # Fallback to single inserts if duplicates or constraint issues occur
            for record in batch:
                try:
                    supabase.table("leads").insert(record).execute()
                    inserted_count += 1
                except Exception:
                    pass

    print(f"✓ Successfully seeded {inserted_count} Sircon commercial brokers into Supabase!")


if __name__ == "__main__":
    seed_sircon_excel()