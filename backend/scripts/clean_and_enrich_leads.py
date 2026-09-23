import os
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_and_enrich():
    # 1. Fetch Sircon Sheet for Domain Cross-Referencing
    sircon_url = "https://docs.google.com/spreadsheets/d/1Gv4IxaeNNcmTZaxhhd65E3ND7Q12SkRJxlnp0L2KIsU/export?format=csv"
    print("Fetching Sircon Master List for domain matching...")
    df_sircon = pd.read_csv(sircon_url)
    
    df_sircon.columns = [c.strip().lower() for c in df_sircon.columns]
    email_col = next((c for c in df_sircon.columns if "email" in c), None)
    name_col = next((c for c in df_sircon.columns if "name" in c), df_sircon.columns[0])

    domain_map = {}
    for _, row in df_sircon.iterrows():
        comp = str(row[name_col]).strip().upper()
        em = str(row[email_col]).strip() if email_col else ""
        if "@" in em:
            domain_map[comp] = {"email": em, "domain": em.split("@")[-1].lower()}

    # 2. Fetch All Unenriched Brokers from Supabase
    res = supabase.table("leads").select("*").eq("type", "broker").execute()
    leads = res.data

    print(f"Cleaning and enriching {len(leads)} brokers in Supabase...")

    titles = ["PRESIDENT", "SECRETARY", "TREASURER", "MMEMBER", "MANAGER", "GENPART", "DIRECTOR", "OFFICER"]
    cleaned_count = 0

    for lead in leads:
        updates = {}
        raw_first = (lead.get("first_name") or "").strip()
        raw_last = (lead.get("last_name") or "").strip()

        # Fix Title vs First Name swap if Title is sitting in first_name
        if raw_first.upper() in titles:
            updates["first_name"] = raw_last if raw_last.upper() != "NAN" else ""
            updates["last_name"] = ""

        # Cross-reference domain from Sircon match
        comp_upper = lead["company_name"].strip().upper()
        match = domain_map.get(comp_upper)

        if match:
            updates["domain"] = match["domain"]
            f_name = updates.get("first_name", raw_first).lower()
            
            if f_name and f_name != "nan":
                updates["email"] = f"{f_name}@{match['domain']}"
            else:
                updates["email"] = match["email"]

        if updates:
            supabase.table("leads").update(updates).eq("id", lead["id"]).execute()
            cleaned_count += 1

    print(f"✓ Cleaned and enriched {cleaned_count} broker records in Supabase!")

if __name__ == "__main__":
    clean_and_enrich()