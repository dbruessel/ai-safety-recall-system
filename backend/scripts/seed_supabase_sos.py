import os
import glob
import pandas as pd
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://YOUR_SUPABASE_PROJECT.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def find_file(pattern):
    matches = glob.glob(os.path.join("data", "raw", pattern))
    return matches[0] if matches else None

def seed_sos():
    corp_file = find_file("*Crprtn*")
    officer_file = find_file("*CrprtOffc*")

    if not corp_file:
        print("Error: Could not locate Corporations file in data/raw/")
        return

    print(f"Reading Master Corporations File (Headerless Mode): {corp_file}...")
    # Read without header row so Pandas uses numeric column indexes (0, 1, 2...)
    df_corp = pd.read_csv(corp_file, header=None, low_memory=False, dtype=str, encoding="latin1")

    print(f"Total Raw Nevada Entities Loaded: {len(df_corp)}")

    # Map Positional Indexes from NV SOS Dump
    corp_id_col = 0      # Corp ID
    status_col = 4       # Entity Status
    name_col = 6         # Company Name
    
    # 1. Keyword Filter for Commercial Insurance & Brokerages
    keywords = ["INSURANCE", "BROKERAGE", "RISK", "UNDERWRIT", "AGENCY", "SURETY", "ASSURANCE"]
    pattern = "|".join(keywords)

    df_corp[name_col] = df_corp[name_col].fillna("").astype(str)
    df_filtered = df_corp[df_corp[name_col].str.upper().str.contains(pattern, regex=True)].copy()

    # 2. Filter Out Non-Target Categories
    exclude_pattern = "TAX|SMOG|NOTARY|NAIL|SALON|BAIL|FUNERAL|TITLE|TRAVEL|CLEAN"
    df_filtered = df_filtered[~df_filtered[name_col].str.upper().str.contains(exclude_pattern, regex=True)]

    # 3. Filter for Active Status
    if status_col in df_filtered.columns:
        df_filtered = df_filtered[df_filtered[status_col].fillna("").astype(str).str.upper().str.contains("ACTIVE|DEFAULT|QUALIFIED|GOOD")]

    print(f"✓ Isolated {len(df_filtered)} active commercial insurance entities in Nevada.")

    # 4. Load Officers File to Match Names & Extract Address/City
    target_ids = set(df_filtered[corp_id_col].dropna().astype(str).str.strip())
    officer_dict = {}

    if officer_file and os.path.exists(officer_file) and target_ids:
        print(f"Reading Officers File: {officer_file}...")
        df_off = pd.read_csv(officer_file, header=None, low_memory=False, dtype=str, encoding="latin1")

        # Officer Positional Indexes
        off_corp_id = 0
        off_first = 2
        off_last = 4
        off_city = 8 if len(df_off.columns) > 8 else None

        df_off_filtered = df_off[df_off[off_corp_id].astype(str).str.strip().isin(target_ids)]

        lv_metro = ["LAS VEGAS", "NORTH LAS VEGAS", "HENDERSON", "SLOAN", "ENTERPRISE", "APEX"]

        for _, row in df_off_filtered.iterrows():
            cid = str(row.get(off_corp_id, "")).strip()
            first = str(row.get(off_first, "")).strip().title()
            last = str(row.get(off_last, "")).strip().title()
            city = str(row.get(off_city, "")).strip().upper() if off_city else ""

            if cid and cid not in officer_dict and first and first.lower() != "nan":
                officer_dict[cid] = {
                    "first_name": first,
                    "last_name": last,
                    "city": city if city in lv_metro else "LAS VEGAS"
                }

    # Format leads for Supabase
    broker_leads = []
    for _, row in df_filtered.iterrows():
        cid = str(row.get(corp_id_col, "")).strip()
        company = str(row.get(name_col, "")).strip()
        officer = officer_dict.get(cid, {})

        if company and company.lower() != "nan":
            broker_leads.append({
                "type": "broker",
                "company_name": company,
                "first_name": officer.get("first_name", ""),
                "last_name": officer.get("last_name", ""),
                "city": officer.get("city", "Las Vegas").title(),
                "state": "NV",
                "qc_status": "pending"
            })

    print(f"Uploading {len(broker_leads)} commercial insurance brokers into Supabase...")
    for i in range(0, len(broker_leads), 200):
        batch = broker_leads[i:i+200]
        supabase.table("leads").upsert(batch, on_conflict="company_name").execute()

    print("✓ Nevada SOS Brokers successfully loaded into Supabase!")

if __name__ == "__main__":
    seed_sos()