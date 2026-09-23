import os
import pandas as pd
import urllib.parse
from supabase import create_client

# Supabase Credentials
SUPABASE_URL = "https://YOUR_SUPABASE_PROJECT.supabase.co"
SUPABASE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_osint_url(company_name, city="Las Vegas"):
    """Generates a 1-click Google search link to find the owner/fleet manager."""
    query = f'"{company_name}" "{city}" "fleet manager" OR "owner" OR "president"'
    return f"https://www.google.com/search?q={urllib.parse.quote(query)}"

def seed_fmcsa():
    file_path = "data/raw/Company_Census_File_20260922.csv"
    
    if not os.path.exists(file_path):
        print(f"Error: Could not find {file_path}. Ensure it is in data/raw/")
        return

    print(f"Processing 1.96 GB FMCSA CSV File in chunks from: {file_path}...")
    
    lv_metro = ["LAS VEGAS", "NORTH LAS VEGAS", "HENDERSON", "SLOAN", "ENTERPRISE", "APEX"]
    
    # Read the 1.96 GB file in 50,000-row chunks to prevent memory crashes
    chunk_size = 50000
    total_fleets_found = 0

    for chunk_idx, chunk in enumerate(pd.read_csv(file_path, chunksize=chunk_size, low_memory=False, encoding='latin1')):
        # Standardize column headers
        chunk.columns = [str(c).upper().strip() for c in chunk.columns]

        # Dynamically locate columns
        state_col = next((c for c in chunk.columns if "PHY_STATE" in c or "STATE" in c), None)
        city_col = next((c for c in chunk.columns if "PHY_CITY" in c or "CITY" in c), None)
        power_units_col = next((c for c in chunk.columns if "TOTAL_POWER_UNITS" in c or "POWER_UNITS" in c), None)
        company_col = next((c for c in chunk.columns if "LEGAL_NAME" in c or "NAME" in c), chunk.columns[0])
        email_col = next((c for c in chunk.columns if "EMAIL_ADDRESS" in c or "EMAIL" in c), None)
        phone_col = next((c for c in chunk.columns if "TELEPHONE" in c or "PHONE" in c), None)

        if not state_col or not city_col:
            continue

        # Filter Chunk: NV + Greater Las Vegas Metro
        filtered = chunk[
            (chunk[state_col].astype(str).str.upper() == 'NV') &
            (chunk[city_col].astype(str).str.upper().isin(lv_metro))
        ].copy()

        # Filter: Fleet Size (Power Units >= 3)
        if power_units_col and not filtered.empty:
            filtered[power_units_col] = pd.to_numeric(filtered[power_units_col], errors='coerce').fillna(0)
            filtered = filtered[filtered[power_units_col] >= 3]

        if filtered.empty:
            continue

        fleet_leads = []
        for _, row in filtered.iterrows():
            company = str(row.get(company_col, '')).strip()
            email = str(row.get(email_col, '')) if email_col else ""
            
            if company and company.lower() != 'nan':
                valid_email = email.strip() if "@" in email else None
                
                fleet_leads.append({
                    "type": "fleet_owner",
                    "company_name": company,
                    "email": valid_email,
                    "phone": str(row.get(phone_col, '')).strip() if phone_col else None,
                    "fleet_size": int(row.get(power_units_col, 0)) if power_units_col else 0,
                    "city": str(row.get(city_col, 'LAS VEGAS')).title(),
                    "state": "NV",
                    "osint_search_url": generate_osint_url(company, str(row.get(city_col, 'LAS VEGAS'))),
                    "qc_status": "pending"
                })

        if fleet_leads:
            total_fleets_found += len(fleet_leads)
            # Upsert batch to Supabase
            supabase.table("leads").upsert(fleet_leads, on_conflict="company_name").execute()
            print(f" Chunk {chunk_idx + 1}: Uploaded {len(fleet_leads)} local fleet records to Supabase...")

    print(f"\n✓ Finished! Successfully loaded {total_fleets_found} Las Vegas Fleet Owners into Supabase.")

if __name__ == "__main__":
    seed_fmcsa()