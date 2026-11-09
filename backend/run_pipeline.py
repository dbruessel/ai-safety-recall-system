import os
import time
from adapters.broker_doi_nv import extract as extract_nv_brokers
from verifier import verify_single_email
from db import stage_leads, supabase

def run_nevada_pipeline():
    print("==================================================")
    print("   RECALL-LOGIC: BULK NEVADA BROKER INGESTION    ")
    print("==================================================")

    # 1. Extract raw broker records
    raw_leads = extract_nv_brokers()
    print(f"[*] Total target brokers in source file: {len(raw_leads)}")

    if not raw_leads:
        print("[!] No leads found. Verify the Excel file is present.")
        return

    # 2. Query Supabase to find what has already been ingested
    print("\n[*] Checking Supabase to skip existing contacts...")
    res = supabase.table("leads").select("email").execute()
    existing_emails = {r["email"].lower() for r in (res.data or []) if r.get("email")}
    print(f"[*] Found {len(existing_emails)} leads already recorded in Supabase.")

    fresh_leads = [lead for lead in raw_leads if lead["email"].lower() not in existing_emails]
    print(f"[+] Fresh, unprocessed commercial brokers to verify: {len(fresh_leads)}")

    if not fresh_leads:
        print("[*] All commercial brokers in this DOI file are already verified and stored.")
        return

    # 3. Verify all remaining fresh leads
    print(f"\n[*] Gating all {len(fresh_leads)} brokers through MillionVerifier...")
    verified_records = []
    ok_count = 0

    for i, lead in enumerate(fresh_leads, 1):
        email = lead["email"]
        mv_data = verify_single_email(email)
        status = mv_data.get("result", "error")
        lead["mv_result"] = status
        
        if status == "ok":
            ok_count += 1
            print(f"  [{i}/{len(fresh_leads)}] ? {email} -> ok")
        else:
            print(f"  [{i}/{len(fresh_leads)}] ? {email} -> {status}")
            
        verified_records.append(lead)
        time.sleep(0.08)  # Smooth API rate pacing

    # 4. Bulk stage into Supabase
    print(f"\n[*] Ingestion complete: {ok_count} approved 'ok' leads out of {len(fresh_leads)} verified.")
    print("[*] Staging all records into Supabase...")
    stage_leads(verified_records, segment="commercial_broker")
    print("[?] Supabase lead inventory fully loaded and ready for campaigns.")

if __name__ == "__main__":
    run_nevada_pipeline()
