import os
import glob
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def find_file(pattern):
    matches = glob.glob(os.path.join("data", "raw", pattern))
    return matches[0] if matches else None

def fix_and_enrich_leads():
    # 1. Load Officer File to extract true First & Last Names
    officer_file = find_file("*CrprtOffc*")
    corp_file = find_file("*Crprtn*")

    if not officer_file or not corp_file:
        print("Error: Raw SOS files not found in data/raw/")
        return

    print("Reading Corporations and Officers files to rebuild clean First & Last names...")
    df_corp = pd.read_csv(corp_file, header=None, low_memory=False, dtype=str, encoding="latin1")
    df_off = pd.read_csv(officer_file, header=None, low_memory=False, dtype=str, encoding="latin1")

    # Corp ID -> Company Name Map
    corp_map = {}
    for _, row in df_corp.iterrows():
        cid = str(row[0]).strip()
        cname = str(row[6]).strip()
        if cid and cname and cname.lower() != "nan":
            corp_map[cid] = cname

    # Corp ID -> { First Name, Last Name } Map
    # Index 0: Corp ID | Index 2: Title | Index 3: First Name | Index 4: Last Name
    name_map = {}
    for _, row in df_off.iterrows():
        cid = str(row[0]).strip()
        first = str(row[3]).strip().title() if len(row) > 3 else ""
        last = str(row[4]).strip().title() if len(row) > 4 else ""

        if cid in corp_map and first and first.lower() != "nan":
            cname = corp_map[cid].upper()
            if cname not in name_map:
                name_map[cname] = {
                    "first_name": first,
                    "last_name": last if last and last.lower() != "nan" else ""
                }

    # 2. Load Sircon List for Company Domain Matching
    sircon_url = "https://docs.google.com/spreadsheets/d/1Gv4IxaeNNcmTZaxhhd65E3ND7Q12SkRJxlnp0L2KIsU/export?format=csv"
    print("Fetching Sircon Master List for domain matching...")
    df_sircon = pd.read_csv(sircon_url)
    
    df_sircon.columns = [c.strip().lower() for c in df_sircon.columns]
    email_col = next((c for c in df_sircon.columns if "email" in c), None)
    comp_col = next((c for c in df_sircon.columns if "name" in c), df_sircon.columns[0])

    domain_map = {}
    for _, row in df_sircon.iterrows():
        c_name = str(row[comp_col]).strip().upper()
        c_email = str(row[email_col]).strip() if email_col else ""
        if "@" in c_email:
            domain_map[c_name] = {"email": c_email, "domain": c_email.split("@")[-1].lower()}

    # 3. Update Supabase Records
    res = supabase.table("leads").select("*").eq("type", "broker").execute()
    leads = res.data

    print(f"Updating {len(leads)} Supabase records with First Name, Last Name, and Domain Emails...")

    updated_count = 0
    for lead in leads:
        comp_upper = lead["company_name"].strip().upper()
        
        # Grab true names
        names = name_map.get(comp_upper, {})
        first = names.get("first_name", "")
        last = names.get("last_name", "")
        
        # Grab domain
        sircon_match = domain_map.get(comp_upper, {})
        domain = sircon_match.get("domain", "")

        updates = {}
        if first:
            updates["first_name"] = first
        if last:
            updates["last_name"] = last
        if domain:
            updates["domain"] = domain
            # Construct best corporate email pattern: first.last@domain.com
            fn_clean = first.lower().replace(" ", "")
            ln_clean = last.lower().replace(" ", "")
            
            if fn_clean and ln_clean:
                updates["email"] = f"{fn_clean}.{ln_clean}@{domain}"
            elif fn_clean:
                updates["email"] = f"{fn_clean}@{domain}"
            else:
                updates["email"] = sircon_match.get("email", "")

        if updates:
            supabase.table("leads").update(updates).eq("id", lead["id"]).execute()
            updated_count += 1

    print(f"✓ Successfully updated {updated_count} records in Supabase with Full Names & Verified Domain Emails!")

if __name__ == "__main__":
    fix_and_enrich_leads()