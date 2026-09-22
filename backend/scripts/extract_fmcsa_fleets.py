import pandas as pd
from supabase import create_client

SUPABASE_URL = "https://YOUR_SUPABASE_PROJECT.supabase.co"
SUPABASE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def process_fmcsa_census(file_path="fmcsa_raw.csv"):
    print("Reading FMCSA Census file...")
    df = pd.read_csv(file_path, low_memory=False)

    # Metro Cities Filter
    lv_metro = ["LAS VEGAS", "NORTH LAS VEGAS", "HENDERSON", "SLOAN", "ENTERPRISE", "APEX"]

    # Filter: Nevada + Metro + Carriers Only + Power Units >= 3
    filtered = df[
        (df['PHY_STATE'] == 'NV') &
        (df['PHY_CITY'].str.upper().isin(lv_metro)) &
        (df['ENTITY_TYPE'] == 'C') &  # Carriers only (excludes brokers)
        (df['TOTAL_POWER_UNITS'] >= 3)
    ]

    print(f"Isolated {len(filtered)} local commercial fleets in Las Vegas metro.")

    fleet_records = []
    for _, row in filtered.iterrows():
        # Derive owner name or fall back to company
        company = str(row.get('LEGAL_NAME', '')).strip()
        email = str(row.get('EMAIL_ADDRESS', '')).strip()
        
        fleet_records.append({
            "type": "fleet_owner",
            "company_name": company,
            "email": email if "@" in email else None,
            "phone": str(row.get('TELEPHONE', '')),
            "fleet_size": int(row.get('TOTAL_POWER_UNITS', 0)),
            "city": row.get('PHY_CITY'),
            "state": "NV",
            "qc_status": "pending"
        })

    # Bulk insert into staging or public.leads
    for i in range(0, len(fleet_records), 100):
        batch = fleet_records[i:i+100]
        supabase.table("leads").upsert(batch, on_conflict="company_name").execute()

    print("✓ FMCSA Fleets loaded into Supabase!")

if __name__ == "__main__":
    process_fmcsa_census()