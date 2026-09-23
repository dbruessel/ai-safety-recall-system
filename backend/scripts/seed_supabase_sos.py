import os
import glob
import pandas as pd
from supabase import create_client

# Supabase Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://YOUR_SUPABASE_PROJECT.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def seed_sos():
    raw_dir = "data/raw"
    
    # Locate exact extracted CSV files
    corp_files = glob.glob(os.path.join(raw_dir, "*Crprtn*.csv"))
    officer_files = glob.glob(os.path.join(raw_dir, "*CrprtOffc*.csv"))
    
    if not corp_files or not officer_files:
        print("Error: Could not locate extracted SOS CSV files in data/raw/")
        return

    corp_path = corp_files[0]
    officer_path = officer_files[0]

    print(f"Reading Master Corporations File: {corp_path}...")
    df_corp = pd.read_csv(corp_path, low_memory=False, encoding='latin1')
    df_corp.columns = [str(c).upper().strip() for c in df_corp.columns]

    print(f"Reading Officers File: {officer_path}...")
    df_offc = pd.read_csv(officer_path, low_memory=False, encoding='latin1')
    df_offc.columns = [str(c).upper().strip() for c in df_offc.columns]

    # Dynamically match column names across NV SOS relational tables
    corp_id_col = next((c for c in df_corp.columns if "ID" in c or "NUMBER" in c or "CORP" in c), df_corp.columns[0])
    offc_id_col = next((c for c in df_offc.columns if "ID" in c or "NUMBER" in c or "CORP" in c), df_offc.columns[0])
    
    corp_name_col = next((c for c in df_corp.columns if "NAME" in c or "ENTITY" in c), None)
    corp_city_col = next((c for c in df_corp.columns if "CITY" in c), None)
    corp_status_col = next((c for c in df_corp.columns if "STATUS" in c), None)

    offc_first_col = next((c for c in df_offc.columns if "FIRST" in c), None)
    offc_last_col = next((c for c in df_offc.columns if "LAST" in c), None)
    offc_title_col = next((c for c in df_offc.columns if "TITLE" in c or "ROLE" in c), None)

    lv_metro = ["LAS VEGAS", "NORTH LAS VEGAS", "HENDERSON"]

    # Filter Corporations for Active Insurance Brokerages in LV
    filtered_corps = df_corp[
        (df_corp[corp_city_col].astype(str).str.upper().isin(lv_metro)) &
        (df_corp[corp_status_col].astype(str).str.upper().str.contains("ACTIVE")) &
        (df_corp[corp_name_col].astype(str).str.upper().str.contains("INSURANCE|BROKERAGE|RISK")) &
        (~df_corp[corp_name_col].astype(str).str.upper().str.contains("TAX|SMOG|NOTARY"))
    ].copy()

    print(f"Filtered {len(filtered_corps)} active commercial insurance agencies in Las Vegas.")

    # Relational Join: Companies + Officers
    merged = pd.merge(
        filtered_corps, 
        df_offc, 
        left_on=corp_id_col, 
        right_on=offc_id_col, 
        how="inner"
    )

    print(f"Matched {len(merged)} decision-maker officer records.")

    broker_leads = []
    for _, row in merged.iterrows():
        company = str(row.get(corp_name_col, '')).strip()
        first_name = str(row.get(offc_first_col, '')).strip() if offc_first_col else ""
        last_name = str(row.get(offc_last_col, '')).strip() if offc_last_col else ""

        if company and company.lower() != 'nan':
            broker_leads.append({
                "type": "broker",
                "company_name": company,
                "first_name": first_name if first_name.lower() != 'nan' else None,
                "last_name": last_name if last_name.lower() != 'nan' else None,
                "city": str(row.get(corp_city_col, 'Las Vegas')).title(),
                "state": "NV",
                "qc_status": "pending"
            })

    print(f"Uploading {len(broker_leads)} broker records into Supabase...")
    for i in range(0, len(broker_leads), 200):
        batch = broker_leads[i:i+200]
        supabase.table("leads").upsert(batch, on_conflict="company_name").execute()

    print("✓ Nevada SOS Brokers successfully loaded into Supabase!")

if __name__ == "__main__":
    seed_sos()