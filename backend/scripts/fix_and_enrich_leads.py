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

    # 1. Fetch Supabase Records First (Only process companies we actually have in DB)
    print("1/4. Fetching broker records from Supabase...")
    res = supabase.table("leads").select("id, company_name, phone").eq("type", "broker").execute()
    leads = res.data
    if not leads:
        print("No broker leads found in Supabase.")
        return

    # Build lookup set of targeted upper-case company names
    target_companies = {l["company_name"].strip().upper(): l for l in leads}
    print(f"Targeting {len(target_companies)} distinct agencies...")

    # 2. Vectorized Read of Corporations File (Filters in milliseconds)
    print("2/4. Indexing Nevada Corporations file...")
    df_corp = pd.read_csv(
        corp_file, 
        header=None, 
        usecols=[0, 6], 
        names=["corp_id", "company_name"], 
        dtype=str, 
        encoding="latin1",
        on_bad_lines="skip"
    )
    df_corp["company_name_upper"] = df_corp["company_name"].str.strip().str.upper()
    
    # Filter only corps matching our Supabase leads
    df_corp_matched = df_corp[df_corp["company_name_upper"].isin(target_companies.keys())]
    corp_id_to_name = dict(zip(df_corp_matched["corp_id"].str.strip(), df_corp_matched["company_name_upper"]))

    print(f"   ✓ Matched {len(corp_id_to_name)} Corporation IDs in raw state file.")

    # 3. Vectorized Read of Officers File
    print("3/4. Parsing Officer First & Last Names...")
    matched_corp_ids = set(corp_id_to_name.keys())
    
    # Read Officers file in 100k chunks for zero memory lag
    name_map = {}
    for chunk in pd.read_csv(
        officer_file, 
        header=None, 
        usecols=[0, 3, 4], 
        names=["corp_id", "first_name", "last_name"], 
        dtype=str, 
        encoding="latin1",
        chunksize=100000,
        on_bad_lines="skip"
    ):
        chunk["corp_id"] = chunk["corp_id"].str.strip()
        matched_chunk = chunk[chunk["corp_id"].isin(matched_corp_ids)]
        
        for _, row in matched_chunk.iterrows():
            cid = row["corp_id"]
            comp_name = corp_id_to_name.get(cid)
            first = str(row["first_name"]).strip().title() if pd.notna(row["first_name"]) else ""
            last = str(row["last_name"]).strip().title() if pd.notna(row["last_name"]) else ""

            if comp_name and first and first.lower() != "nan" and comp_name not in name_map:
                name_map[comp_name] = {
                    "first_name": first,
                    "last_name": last if last.lower() != "nan" else ""
                }

    print(f"   ✓ Successfully mapped full officer names for {len(name_map)} agencies.")

    # 4. Stream Updates to Supabase
    print("4/4. Updating Supabase leads table...")
    updated_count = 0
    for comp_name, lead_info in target_companies.items():
        if comp_name in name_map:
            officer = name_map[comp_name]
            first = officer["first_name"]
            last = officer["last_name"]
            
            # Construct corporate email pattern if domain exists
            updates = {"first_name": first, "last_name": last}
            
            fn_clean = first.lower().replace(" ", "")
            ln_clean = last.lower().replace(" ", "")
            
            # If domain is present in record, construct direct pattern
            domain_res = supabase.table("leads").select("domain").eq("id", lead_info["id"]).execute()
            if domain_res.data and domain_res.data[0].get("domain"):
                dom = domain_res.data[0]["domain"]
                if fn_clean and ln_clean:
                    updates["email"] = f"{fn_clean}.{ln_clean}@{dom}"
                elif fn_clean:
                    updates["email"] = f"{fn_clean}@{dom}"

            supabase.table("leads").update(updates).eq("id", lead_info["id"]).execute()
            updated_count += 1

    print(f"✓ FINISHED! Updated {updated_count} broker records with First & Last names and email patterns.")

if __name__ == "__main__":
    fix_and_enrich_leads()