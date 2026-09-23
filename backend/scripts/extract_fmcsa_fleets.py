import pandas as pd
from supabase import create_client
import os
import zipfile
import glob

SUPABASE_URL = "https://YOUR_SUPABASE_PROJECT.supabase.co"
SUPABASE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_target_filepath():
    """Finds the Company Census file in data/raw/ regardless of extension or zip format."""
    raw_dir = "data/raw"
    
    # Check for zipped download
    zip_matches = glob.glob(os.path.join(raw_dir, "*Company_Census_File*.*zip*")) + glob.glob(os.path.join(raw_dir, "*Census*.*zip*"))
    if zip_matches:
        zip_path = zip_matches[0]
        print(f"Extracting zip archive: {zip_path}...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(raw_dir)
            
    # Search for extracted txt/csv/dat files
    matches = glob.glob(os.path.join(raw_dir, "*Company_Census_File*")) + glob.glob(os.path.join(raw_dir, "*Census*"))
    for m in matches:
        if not m.endswith(".zip"):
            return m
            
    return None

def seed_fmcsa():
    file_path = get_target_filepath()
    
    if not file_path or not os.path.exists(file_path):
        print("Error: Could not locate Company Census file in data/raw/. Ensure it is saved in that folder.")
        return

    print(f"Reading raw FMCSA Census file from: {file_path}")
    
    try:
        df = pd.read_csv(file_path, sep=None, engine='python', low_memory=False, encoding='latin1')
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    df.columns = [str(c).upper().strip() for c in df.columns]

    lv_metro = ["LAS VEGAS", "NORTH LAS VEGAS", "HENDERSON", "SLOAN", "ENTERPRISE", "APEX"]

    state_col = next((c for c in df.columns if "PHY_STATE" in c or "STATE" in c), None)
    city_col = next((c for c in df.columns if "PHY_CITY" in c or "CITY" in c), None)
    power_units_col = next((c for c in df.columns if "POWER" in c or "UNITS" in c), None)
    company_col = next((c for c in df.columns if "LEGAL_NAME" in c or "NAME" in c), df.columns[0])
    email_col = next((c for c in df.columns if "EMAIL" in c), None)
    phone_col = next((c for c in df.columns if "TELEPHONE" in c or "PHONE" in c), None)

    if not state_col or not city_col:
        print("Error: Could not identify City/State columns in dataset.")
        return

    filtered = df[
        (df[state_col].astype(str).str.upper() == 'NV') &
        (df[city_col].astype(str).str.upper().isin(lv_metro))
    ].copy()

    if power_units_col:
        filtered[power_units_col] = pd.to_numeric(filtered[power_units_col], errors='coerce').fillna(0)
        filtered = filtered[filtered[power_units_col] >= 3]

    print(f"Isolated {len(filtered)} local commercial fleets in Las Vegas metro.")

    fleet_leads = []
    for _, row in filtered.iterrows():
        company = str(row.get(company_col, '')).strip()
        email = str(row.get(email_col, '')) if email_col else ""

        if company and company.lower() != 'nan':
            fleet_leads.append({
                "type": "fleet_owner",
                "company_name": company,
                "email": email.strip() if "@" in email else None,
                "phone": str(row.get(phone_col, '')) if phone_col else None,
                "fleet_size": int(row.get(power_units_col, 0)) if power_units_col else 0,
                "city": str(row.get(city_col, 'LAS VEGAS')).title(),
                "state": "NV",
                "qc_status": "pending"
            })

    print(f"Uploading {len(fleet_leads)} fleet owners into Supabase...")
    for i in range(0, len(fleet_leads), 200):
        batch = fleet_leads[i:i+200]
        supabase.table("leads").upsert(batch, on_conflict="company_name").execute()

    print("✓ FMCSA Fleets successfully loaded into Supabase!")

if __name__ == "__main__":
    seed_fmcsa()