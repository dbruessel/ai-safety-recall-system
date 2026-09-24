import pandas as pd
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

excel_path = "Resident_Producer_List_Sep-23-2026.xlsx"

print(f"Reading {excel_path}...")
df = pd.read_excel(excel_path)

# Clean headers
df.columns = [c.strip().replace("'", "") for c in df.columns]

# Exclude captive personal-lines / financial domains
exclude_domains = [
    'primerica.com', 'statefarm.com', 'allstate.com', 'farmersagency.com',
    'wellsfargo.com', 'edwardjones.com', 'ampf.com', 'nm.com', 'foundever.com',
    'gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'outlook.com', 'icloud.com'
]

def get_domain(email):
    if pd.isna(email) or '@' not in str(email):
        return ''
    return str(email).split('@')[-1].lower().strip()

df['domain'] = df['Email Address'].apply(get_domain)

# Filter for corporate agency domains not in exclusion list
df_filtered = df[~df['domain'].isin(exclude_domains) & (df['domain'] != '')].copy()

print(f"✓ Isolated {len(df_filtered)} commercial agency producers with corporate domain emails.")

broker_leads = []
for _, row in df_filtered.iterrows():
    full_name = str(row.get('Name', '')).strip().title()
    name_parts = full_name.split(' ')
    first_name = name_parts[0] if len(name_parts) > 0 else ''
    last_name = name_parts[-1] if len(name_parts) > 1 else ''
    
    email = str(row.get('Email Address', '')).strip().lower()
    city = str(row.get('City', 'Las Vegas')).strip().title()
    state = str(row.get('State', 'NV')).strip().upper()
    phone = str(row.get('Bus Phone', '')).strip()

    if email and '@' in email:
        broker_leads.append({
            "type": "broker",
            "first_name": first_name,
            "last_name": last_name,
            "company_name": f"{row.get('domain', '')} Agency",
            "email": email,
            "phone": phone if phone != 'nan' else '',
            "city": city,
            "state": state,
            "qc_status": "approved",
            "pushed_to_instantly": False
        })

# Deduplicate by email
df_leads = pd.DataFrame(broker_leads).drop_duplicates(subset=['email'])
records = df_leads.to_dict(orient='records')

print(f"Uploading {len(records)} unique commercial producers to Supabase...")

for i in range(0, len(records), 100):
    batch = records[i : i + 100]
    try:
        supabase.table("leads").upsert(batch, on_conflict="email").execute()
        print(f"  ✓ Uploaded batch {i // 100 + 1}")
    except Exception as e:
        print(f"  ❌ Batch note: {e}")

print("✓ Nevada DOI Resident Producers successfully staged into Supabase!")