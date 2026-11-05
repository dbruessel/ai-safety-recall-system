import os
import glob
import time
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

# 1. Automatically load environment variables from .env file
load_dotenv()

# 2. Retrieve credentials safely from environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def find_file(pattern):
    """Utility to locate raw data files matching glob patterns."""
    matches = glob.glob(os.path.join("data", "raw", pattern))
    return matches[0] if matches else None


def seed_sos():
    corp_file = find_file("*Crprtn*")
    officer_file = find_file("*CrprtOffc*")

    if not corp_file:
        print("Error: Could not locate Corporations file in data/raw/")
        return

    print(f"Reading Master Corporations File (Headerless Mode): {corp_file}...")
    df_corp = pd.read_csv(
        corp_file, header=None, low_memory=False, dtype=str, encoding="latin1"
    )

    print(f"Total Raw Nevada Entities Loaded: {len(df_corp)}")

    # Map Positional Indexes from Nevada SOS CSV Dump
    corp_id_col = 0  # Corporation / Entity ID
    status_col = 4   # Entity Status
    name_col = 6     # Company / Entity Name

    # 1. Commercial Insurance Keywords Filter
    keywords = [
        "INSURANCE",
        "BROKERAGE",
        "RISK",
        "UNDERWRIT",
        "AGENCY",
        "SURETY",
        "ASSURANCE",
    ]
    pattern = "|".join(keywords)

    df_corp[name_col] = df_corp[name_col].fillna("").astype(str)
    df_filtered = df_corp[
        df_corp[name_col].str.upper().str.contains(pattern, regex=True)
    ].copy()

    # 2. Exclude Non-Target Categories
    exclude_pattern = "TAX|SMOG|NOTARY|NAIL|SALON|BAIL|FUNERAL|TITLE|TRAVEL|CLEAN"
    df_filtered = df_filtered[
        ~df_filtered[name_col].str.upper().str.contains(exclude_pattern, regex=True)
    ]

    # 3. Filter for Active Status
    if status_col in df_filtered.columns:
        df_filtered = df_filtered[
            df_filtered[status_col]
            .fillna("")
            .astype(str)
            .str.upper()
            .str.contains("ACTIVE|DEFAULT|QUALIFIED|GOOD")
        ]

    print(f"✓ Isolated {len(df_filtered)} active commercial insurance entities in Nevada.")

    # 4. Load Officers File to Match Names & Verify Las Vegas Metro Presence
    target_ids = set(df_filtered[corp_id_col].dropna().astype(str).str.strip())
    officer_dict = {}

    lv_metro = [
        "LAS VEGAS",
        "NORTH LAS VEGAS",
        "HENDERSON",
        "SLOAN",
        "ENTERPRISE",
        "APEX",
    ]

    if officer_file and os.path.exists(officer_file) and target_ids:
        print(f"Reading Officers File: {officer_file}...")
        df_off = pd.read_csv(
            officer_file, header=None, low_memory=False, dtype=str, encoding="latin1"
        )

        # Positional Indexes for Officers File
        off_corp_id = 0
        off_first = 2
        off_last = 4

        df_off_filtered = df_off[
            df_off[off_corp_id].astype(str).str.strip().isin(target_ids)
        ]

        for _, row in df_off_filtered.iterrows():
            cid = str(row.get(off_corp_id, "")).strip()
            first = str(row.get(off_first, "")).strip().title()
            last = str(row.get(off_last, "")).strip().title()

            row_str = " ".join([str(val).upper() for val in row.values])
            is_lv = any(city in row_str for city in lv_metro)

            if cid and first and first.lower() != "nan":
                if cid not in officer_dict or is_lv:
                    officer_dict[cid] = {
                        "first_name": first,
                        "last_name": last,
                        "is_lv": is_lv,
                    }

    # 5. Format Leads & Restrict to Las Vegas Metro Area
    broker_leads = []
    for _, row in df_filtered.iterrows():
        cid = str(row.get(corp_id_col, "")).strip()
        company = str(row.get(name_col, "")).strip()
        officer = officer_dict.get(cid, {})

        # Ensure entity or officer has a Las Vegas Metro location
        row_str = " ".join([str(val).upper() for val in row.values])
        if any(city in row_str for city in lv_metro) or officer.get("is_lv", False):
            if company and company.lower() != "nan":
                broker_leads.append(
                    {
                        "type": "broker",
                        "company_name": company,
                        "first_name": officer.get("first_name", ""),
                        "last_name": officer.get("last_name", ""),
                        "city": "Las Vegas",
                        "state": "NV",
                        "qc_status": "pending",
                    }
                )

    print(f"Uploading {len(broker_leads)} Las Vegas Metro brokers to Supabase...")

    # 6. Batch Insert to Supabase with Duplicate & Error Handling
    inserted_count = 0
    for i in range(0, len(broker_leads), 50):
        batch = broker_leads[i : i + 50]
        try:
            supabase.table("leads").insert(batch).execute()
            inserted_count += len(batch)
        except Exception as e:
            err_str = str(e).lower()
            # If batch contains duplicates, fall back to inserting record by record
            if "duplicate key" in err_str or "23505" in err_str or "42p10" in err_str:
                for record in batch:
                    try:
                        supabase.table("leads").insert(record).execute()
                        inserted_count += 1
                    except Exception:
                        pass  # Skip individual existing duplicate record
            else:
                print(f"Notice on batch {i//50 + 1}: {e}")

    print(f"✓ Nevada SOS Las Vegas Brokers successfully processed! ({inserted_count} new leads added/updated in Supabase)")


if __name__ == "__main__":
    seed_sos()