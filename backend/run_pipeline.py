import os
import time
import subprocess
from adapters.broker_doi_nv import extract as extract_nv_brokers
from verifier import verify_single_email
from db import stage_leads, supabase

# Match your daily email warmup headroom
DAILY_VERIFICATION_CAP = 30 

def run_nevada_pipeline():
    print("==================================================")
    print("      RECALL-LOGIC: NEVADA BROKER PIPELINE       ")
    print("==================================================")

    # 1. Extract and normalize brokers from the local DOI sheet
    raw_leads = extract_nv_brokers()
    print(f"[*] Total target brokers parsed from sheet: {len(raw_leads)}")

    if not raw_leads:
        print("[!] No leads found. Verify the Excel file is present.")
        return

    # 2. Query Supabase to skip previously ingested leads
    print("\n[*] Querying Supabase for existing contacts to avoid duplicate verifications...")
    res = supabase.table("leads").select("email").execute()
    existing_emails = {r["email"].lower() for r in (res.data or []) if r.get("email")}
    print(f"[*] Found {len(existing_emails)} leads already recorded in Supabase.")

    # 3. Identify unseen leads
    fresh_leads = [lead for lead in raw_leads if lead["email"].lower() not in existing_emails]
    print(f"[+] Fresh, unprocessed commercial brokers remaining: {len(fresh_leads)}")

    if not fresh_leads:
        print("[*] All commercial brokers in this DOI file have been processed.")
        print("[*] Proceeding directly to campaign dispatch check.")
    else:
        # Take the daily drip batch
        batch = fresh_leads[:DAILY_VERIFICATION_CAP]
        print(f"\n[*] Gating next batch of {len(batch)} brokers through MillionVerifier...")

        verified_records = []
        for lead in batch:
            email = lead["email"]
            mv_data = verify_single_email(email)
            lead["mv_result"] = mv_data.get("result", "error")
            print(f"    - {email} -> {lead['mv_result']}")
            verified_records.append(lead)
            time.sleep(0.12)

        # 4. Stage into Supabase with strict enums
        print("\n[*] Staging verified batch into Supabase leads table...")
        stage_leads(verified_records, segment="commercial_broker")

    # 5. Hand off to Instantly
    print("\n[*] Checking for push_clean_cohorts.py to fill Instantly queue...")
    target_push = "push_clean_cohorts.py"
    if not os.path.exists(target_push) and os.path.exists(os.path.join("scripts", "push_clean_cohorts.py")):
        target_push = os.path.join("scripts", "push_clean_cohorts.py")

    if os.path.exists(target_push):
        try:
            subprocess.run(["python", target_push], check=True)
            print("[?] Instantly dispatch completed successfully.")
        except Exception as e:
            print(f"[!] Push execution failed: {e}")
    else:
        print(f"[!] {target_push} not found.")

if __name__ == "__main__":
    run_nevada_pipeline()
