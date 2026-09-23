import pandas as pd
from supabase import create_client
import os
import glob

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

    print(f"Reading Master Corporations File: {corp_file}...")
    df_corp = pd.read_csv(corp_file, low_memory=False, dtype=str, encoding="latin1")
    df_corp.columns = [c.strip().upper() for c in df_corp.columns]

    # Find Corp ID & Name Columns
    corp_id_col = next((c for c in df_corp.columns if any(k in c for k in ["CORP_ID", "ENTITY_ID", "ID"])), df_corp.columns[0])
    corp_name_col = next((c for c in df_corp.columns if any(k in c for k in ["CORP_NAME", "NAME", "ENTITY_NAME"])), df_corp.columns[1])
    
    # Find City & Status Columns
    city_col = next((c for c in df_corp.columns if "CITY" in c), None)
    status_col = next((c for c in df_corp.columns if "STATUS" in c), None)

    # 1. Filter for Active Insurance / Brokerage Keywords FIRST (Massively reduces row count)
    keywords = ["INSURANCE", "BROKERAGE", "RISK", "UNDERWRITER", "AGENCY"]
    pattern = "|".join(keywords)
    df_corp = df_corp[df_corp[corp_name_col].fillna("").astype(str).str.upper().str.contains(pattern)]

    # 2. Filter out Non-Commercial Keywords
    exclude_pattern = "TAX|SMOG|NOTARY|NAIL|SALON|BAIL"
    df_corp = df_corp[~df_corp[corp_name_col].fillna("").astype(str).str.upper().str.contains(exclude_pattern)]

    # 3. Filter for Las Vegas Metro Cities
    lv_metro = ["LAS VEGAS", "NORTH LAS VEGAS", "HENDERSON", "SLOAN", "ENTERPRISE", "APEX"]
    if city_col:
        df_corp = df_corp[df_corp[city_col].fillna("").astype(str).str.upper().isin(lv_metro)]

    # 4. Filter for Active Status
    if status_col:
        df_corp = df_corp[df_corp[status_col].fillna("").astype(str).str.upper().str.contains("ACTIVE|DEFAULT|QUALIFIED")]

    print(f"✓ Target locked: Isolated {len(df_corp)} active commercial insurance entities in Las Vegas.")

    # Match Officers only for the targeted brokers
    target_ids = set(df_corp[corp_id_col].dropna().astype(str).str.strip())
    officer_dict = {}

    if officer_file and os.path.exists(officer_file) and target_ids:
        print(f"Reading Officers File: {officer_file}...")
        df_off = pd.read_csv(officer_file, low_memory=False, dtype=str, encoding="latin1")
        df_off.columns = [c.strip().upper() for c in df_off.columns]

        off_corp_id = next((c for c in df_off.columns if any(k in c for k in ["CORP_ID", "ENTITY_ID"])), df_off.columns[0])
        first_col = next((c for c in df_off.columns if "FIRST" in c), "")
        last_col = next((c for c in df_off.columns if "LAST" in c), "")

        # Only extract officers for our target brokers
        df_off_filtered = df_off[df_off[off_corp_id].astype(str).str.strip().isin(target_ids)]

        for _, row in df_off_filtered.iterrows():
            cid = str(row.get(off_corp_id, "")).strip()
            if cid and cid not in officer_dict:
                first = str(row.get(first_col, "")).strip().title()
                last = str(row.get(last_col, "")).strip().title()
                if first and first.lower() != "nan":
                    officer_dict[cid] = {"first_name": first, "last_name": last}

    # Format leads for Supabase
    broker_leads = []
    for _, row in df_corp.iterrows():
        cid = str(row.get(corp_id_col, "")).strip()
        company = str(row.get(corp_name_col, "")).strip()
        officer = officer_dict.get(cid, {})

        if company and company.lower() != "nan":
            broker_leads.append({
                "type": "broker",
                "company_name": company,
                "first_name": officer.get("first_name", ""),
                "last_name": officer.get("last_name", ""),
                "city": str(row.get(city_col, "Las Vegas")).title() if city_col else "Las Vegas",
                "state": "NV",
                "qc_status": "pending"
            })

    print(f"Uploading {len(broker_leads)} target commercial brokers to Supabase...")
    for i in range(0, len(broker_leads), 200):
        batch = broker_leads[i:i+200]
        supabase.table("leads").upsert(batch, on_conflict="company_name").execute()

    print("✓ Nevada SOS Brokers successfully loaded into Supabase!")

if __name__ == "__main__":
    seed_sos()