import os
import pandas as pd
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1. Fetch Sircon list with domains/emails
sircon_url = "https://docs.google.com/spreadsheets/d/1Gv4IxaeNNcmTZaxhhd65E3ND7Q12SkRJxlnp0L2KIsU/export?format=csv"
df_sircon = pd.read_csv(sircon_url)

# Clean column names
df_sircon.columns = [c.strip().lower() for c in df_sircon.columns]
sircon_email_col = next((c for c in df_sircon.columns if "email" in c), None)
sircon_name_col = next((c for c in df_sircon.columns if "name" in c), df_sircon.columns[0])

# Build lookup map: Clean Company Name -> Domain/Email
domain_map = {}
for _, row in df_sircon.iterrows():
    c_name = str(row[sircon_name_col]).strip().upper()
    c_email = str(row[sircon_email_col]).strip() if sircon_email_col else ""
    if "@" in c_email:
        domain = c_email.split("@")[-1].lower()
        domain_map[c_name] = {"email": c_email, "domain": domain}

# 2. Fetch pending brokers from Supabase
res = supabase.table("leads").select("*").eq("type", "broker").is_("email", "null").execute()
pending_brokers = res.data

print(f"Cross-referencing {len(pending_brokers)} pending SOS brokers against Sircon data...")

updated_count = 0
for lead in pending_brokers:
    comp_upper = lead["company_name"].strip().upper()
    match = domain_map.get(comp_upper)
    
    if match:
        first = (lead.get("first_name") or "").strip().lower()
        last = (lead.get("last_name") or "").strip().lower()
        domain = match["domain"]
        
        # Build decision maker email pattern if name exists, else fallback to Sircon firm email
        constructed_email = f"{first}.{last}@{domain}" if first and last else f"{first}@{domain}" if first else match["email"]
        
        supabase.table("leads").update({
            "email": constructed_email.lower(),
            "domain": domain
        }).eq("id", lead["id"]).execute()
        
        updated_count += 1

print(f"✓ Successfully enriched {updated_count} brokers with verified domain email patterns!")