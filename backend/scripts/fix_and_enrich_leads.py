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

    # 1. Fetch Supabase Records
    print("1/4. Fetching broker records from Supabase...")
    res = supabase.table("leads").select("id, company_name, domain").eq("type", "broker").execute()
    leads = res.data
    if not leads:
        print("No broker leads found in Supabase.")
        return

    target_companies = {l["company_name"].strip().upper(): l for l in leads}
    print(f"Targeting {len(target_companies)} distinct agencies...")

    # 2. Vectorized Read of Corporations File (Grab Corp ID + Phone if available)
    print("2/4. Indexing Nevada Corporations file...")
    df_corp = pd.read_csv(
        corp_file, 
        header=None, 
        dtype=str, 
        encoding="latin1",
        on_bad_lines="skip"
    )
    
    # Col 0: Corp ID, Col 6: Company Name
    df_corp["corp_id"] = df_corp[0].str.strip()
    df_corp["company_name_upper"] = df_corp[6].str.strip().str.upper()
    
    df_corp_matched = df_corp[df_corp["company_name_upper"].isin(target_companies.keys())]
    corp_id_to_name = dict(zip(df_corp_matched["corp_id"], df_corp_matched["company_name_upper"]))

    # 3. Vectorized Read of Officers File (SWAPPED COLUMNS: 3 = Last Name, 4 = First Name)
    print("3/4. Parsing Officer Names (Swapping Last -> First) & Phones...")
    matched_corp_ids = set(corp_id_to_name.keys())
    
    name_map = {}
    for chunk in pd.read_csv(
        officer_file, 
        header=None, 
        dtype=str, 
        encoding="latin1",
        chunksize=100000,
        on_bad_lines="skip"
    ):
        chunk[0] = chunk[0].str.strip()
        matched_chunk = chunk[chunk[0].isin(matched_corp_ids)]
        
        for _, row in matched_chunk.iterrows():
            cid = row[0]
            comp_name = corp_id_to_name.get(cid)
            
            # Nevada SOS Format: Index 3 = LAST_NAME, Index 4 = FIRST_NAME
            last = str(row[3]).strip().title() if pd.notna(row[3]) else ""
            first = str(row[4]).strip().title() if pd.notna(row[4]) else ""
            
            # Extract phone if present in officer records (often in index 10-14)
            phone_val = ""
            for idx in range(8, len(row)):
                val = str(row[idx]).strip()
                if val.replace("-", "").replace("(", "").replace(")", "").replace(" ", "").isdigit() and len(val) >= 10:
                    phone_val = val
                    break

            if comp_name and first and first.lower() != "nan" and comp_name not in name_map:
                name_map[comp_name] = {
                    "first_name": first,
                    "last_name": last if last.lower() != "nan" else "",
                    "phone": phone_val
                }

    print(f"   ✓ Mapped corrected names for {len(name_map)} agencies.")

    # 4. Also Load Sircon Sheet for Domain + Direct Phone Matching
    sircon_url = "https://docs.google.com/spreadsheets/d/1Gv4IxaeNNcmTZaxhhd65E3ND7Q12SkRJxlnp0L2KIsU/export?format=csv"
    sircon_map = {}
    try:
        df_sircon = pd.read_csv(sircon_url, storage_options={'User-Agent': 'Mozilla/5.0'})
        df_sircon.columns = [c.strip().lower() for c in df_sircon.columns]
        comp_col = next((c for c in df_sircon.columns if "name" in c), df_sircon.columns[0])
        email_col = next((c for c in df_sircon.columns if "email" in c), None)
        phone_col = next((c for c in df_sircon.columns if "phone" in c), None)

        for _, row in df_sircon.iterrows():
            cn = str(row[comp_col]).strip().upper()
            em = str(row[email_col]).strip() if email_col else ""
            ph = str(row[phone_col]).strip() if phone_col else ""
            
            dom = em.split("@")[-1].lower() if "@" in em else ""
            sircon_map[cn] = {"domain": dom, "phone": ph if ph.lower() != "nan" else ""}
    except Exception as e:
        print(f"Sircon fetch note: {e}")

    # 5. Push Corrected Data to Supabase
    print("4/4. Correcting Supabase records...")
    updated_count = 0
    for comp_name, lead_info in target_companies.items():
        officer = name_map.get(comp_name, {})
        s_info = sircon_map.get(comp_name, {})

        first = officer.get("first_name", "")
        last = officer.get("last_name", "")
        phone = officer.get("phone", "") or s_info.get("phone", "")
        domain = lead_info.get("domain", "") or s_info.get("domain", "")

        updates = {}
        if first:
            updates["first_name"] = first
        if last:
            updates["last_name"] = last
        if phone:
            updates["phone"] = phone
        if domain:
            updates["domain"] = domain

        # Re-construct correct email with First.Last
        if domain and first:
            fn = first.lower().replace(" ", "")
            ln = last.lower().replace(" ", "")
            if fn and ln:
                updates["email"] = f"{fn}.{ln}@{domain}"
            elif fn:
                updates["email"] = f"{fn}@{domain}"

        if updates:
            supabase.table("leads").update(updates).eq("id", lead_info["id"]).execute()
            updated_count += 1

    print(f"✓ FINISHED! Successfully corrected {updated_count} broker records in Supabase.")

if __name__ == "__main__":
    fix_and_enrich_leads()