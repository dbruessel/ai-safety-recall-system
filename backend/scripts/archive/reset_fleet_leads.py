import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY"))

# Fetch all fleet leads currently marked 'rejected' that actually have an email populated
res = supabase.table("leads") \
    .select("id, email, domain") \
    .eq("type", "fleet_owner") \
    .eq("qc_status", "rejected") \
    .not_.is_("email", "null") \
    .execute()

leads = res.data
print(f"Found {len(leads)} fleet leads with existing emails to reset.")

# Exclude free webmail if you only want custom corporate domains
DISALLOWED_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "sbcglobal.net"]

reset_count = 0
for lead in leads:
    domain = (lead.get("domain") or "").lower()
    if domain and domain not in DISALLOWED_DOMAINS:
        supabase.table("leads").update({
            "qc_status": "pending"
        }).eq("id", lead["id"]).execute()
        reset_count += 1

print(f"✓ Reset {reset_count} fleet corporate leads back to 'pending' state.")