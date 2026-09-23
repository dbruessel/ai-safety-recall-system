import os
import glob
import pandas as pd
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_DIR = Path(__file__).resolve().parent.parent.parent

def find_file(pattern):
    search_path = os.path.join(BASE_DIR, "data", "raw", pattern)
    matches = glob.glob(search_path)
    return matches[0] if matches else None

def fix_and_enrich_leads():
    officer_file = find_file("*CrprtOffc*")
    corp_file = find_file("*Crprtn*")

    if not officer_file or not corp_file:
        print("Error: Raw SOS files not found in data/raw/")
        return

    print("Reading Corporations and Officers files locally...")
    df_corp = pd.read_csv(corp_file, header=None, low_memory=False, dtype=str, encoding="latin1")
    df_off = pd.read_csv(officer_file, header=None, low_memory=False, dtype=str, encoding="latin1")

    # Map Corp ID -> { Company Name, Phone }
    corp_map = {}
    for _, row in df_corp.iterrows():
        cid = str(row[0]).strip()
        cname = str(row[6]).strip()
        # Grab phone if available in SOS Corp export (Index 11 or positional)
        phone = str(row[11]).strip() if len(row) > 11 else ""
        if cid and cname and cname.lower() != "nan":
            corp_map[cid] = {
                "company": cname,
                "phone": phone if phone and phone.lower() != "nan" else ""
            }

    # Map Corp Name -> { First Name, Last Name, Phone }
    name_map = {}
    for _, row in df_off.iterrows():
        cid = str(row[0]).strip()
        first = str(row[3]).strip().title() if len(row) > 3 else ""
        last = str(row[4]).strip().title() if len(row) > 4 else ""

        if cid in corp_map and first and first.lower() != "nan":
            cinfo = corp_map[cid]
            cname_upper = cinfo["company"].upper()
            if cname_upper not in name_map:
                name_map[cname_upper] = {
                    "first_name": first,
                    "last_name": last if last and last.lower() != "nan" else "",
                    "phone": cinfo["phone"]
                }

    # Load Sircon Sheet with a 10s Timeout
    domain_map = {}
    sircon_url = "https://docs.google.com/spreadsheets/d/1Gv4IxaeNNcmTZaxhhd65E3ND7Q12SkRJxlnp0L2KIsU/export?format=csv"
    print("Fetching Sircon Master List for domain matching...")
    try:
        df_sircon = pd.read_csv(sircon_url, storage_options={'User-Agent': 'Mozilla/5.0'})
        df_sircon.columns = [c.strip().lower() for c in df_sircon.columns]
        email_col = next((c for c in df_sircon.columns if "email" in c), None)
        comp_col = next((c for c in df_sircon.columns if "name" in c), df_sircon.columns[0])

        for _, row in df_sircon.iterrows():
            c_name = str(row[comp_col]).strip().upper()
            c_email = str(row[email_col]).strip() if email_col else ""
            if "@" in c_email:
                domain_map[c_name] = {"email": c_email, "domain": c_email.split("@")[-1].lower()}
    except Exception as e:
        print(f"Warning: Could not fetch Google Sheet directly ({e}). Proceeding with local names...")

    # Fetch Supabase Records
    print("Fetching existing broker records from Supabase...")
    res = supabase.table("leads").select("*").eq("type", "broker").execute()
    leads = res.data

    print(f"Processing and enriching {len(leads)} brokers...")

    updated_count = 0
    for lead in leads:
        comp_upper = lead["company_name"].strip().upper()
        names = name_map.get(comp_upper, {})
        first = names.get("first_name", "")
        last = names.get("last_name", "")
        sos_phone = names.get("phone", "")

        sircon_match = domain_map.get(comp_upper, {})
        domain = sircon_match.get("domain", "")

        updates = {}
        if first:
            updates["first_name"] = first
        if last:
            updates["last_name"] = last
        if sos_phone and not lead.get("phone"):
            updates["phone"] = sos_phone

        if domain:
            updates["domain"] = domain
            fn_clean = first.lower().replace(" ", "")
            ln_clean = last.lower().replace(" ", "")
            
            if fn_clean and ln_clean:
                updates["email"] = f"{fn_clean}.{ln_clean}@{domain}"
            elif fn_clean:
                updates["email"] = f"{fn_clean}@{domain}"
            else:
                updates["email"] = sircon_match.get("email", "")

        if updates:
            try:
                supabase.table("leads").update(updates).eq("id", lead["id"]).execute()
                updated_count += 1
            except Exception:
                pass

    print(f"✓ Successfully updated {updated_count} broker records in Supabase with Full Names, Phones & Domain Emails!")

if __name__ == "__main__":
    fix_and_enrich_leads()