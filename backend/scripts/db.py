import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE credentials in .env file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

VALID_SEGMENTS = {"commercial_broker", "commercial_fleet", "cri_inspector"}

def stage_leads(leads: list, segment: str):
    """
    Safely upserts verified leads into Supabase.
    Deduplicates automatically using ON CONFLICT (email).
    """
    if segment not in VALID_SEGMENTS:
        raise ValueError(f"Invalid segment '{segment}'. Must be one of {VALID_SEGMENTS}")

    if not leads:
        print(f"[*] No leads to stage for {segment}.")
        return 0

    clean_records = []
    for l in leads:
        email = str(l.get("email", "")).strip().lower()
        if not email or "@" not in email:
            continue

        mv_status = l.get("mv_result", "unknown")
        
        # Enforce strict Postgres enum schema
        health_status = "ready_to_contact" if mv_status == "ok" else "do_not_contact"
        qc_status = "approved" if mv_status == "ok" else "rejected"
        campaign_status = "staged" if mv_status == "ok" else "failed"

        clean_records.append({
            "first_name": (l.get("first_name") or "").strip().title(),
            "last_name": (l.get("last_name") or "").strip().title(),
            "company_name": (l.get("company_name") or "").strip(),
            "email": email,
            "phone": (l.get("phone") or "").strip(),
            "job_title": (l.get("job_title") or "").strip(),
            "city": (l.get("city") or "Las Vegas").strip().title(),
            "state": (l.get("state") or "NV").strip().upper(),
            "domain": email.split("@")[-1],
            "lead_type": segment,
            "health_status": health_status,
            "qc_status": qc_status,
            "campaign_status": campaign_status,
            "mv_result": mv_status,
            "pushed_to_instantly": False
        })

    # Batch upsert with conflict avoidance
    res = supabase.table("leads").upsert(clean_records, on_conflict="email").execute()
    print(f"[+] Successfully staged {len(clean_records)} leads for segment '{segment}'.")
    return len(clean_records)