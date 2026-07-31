import os
from datetime import datetime, timedelta
from supabase import create_client
import requests  # Or import resend

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def send_email_alert(to_email: str, company_name: str, new_recalls: list):
    """Sends a crisp HTML email digest of newly detected fleet recalls."""
    
    recall_items_html = "".join([
        f"<li style='margin-bottom: 8px;'><b>Unit #{r.get('unit_number', 'N/A')}</b> ({r['make']} {r['model']}): {r['summary']}</li>"
        for r in new_recalls
    ])
    
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">RecallLogic Automated Fleet Advisory</h2>
        <p>Hello <b>{company_name}</b>,</p>
        <p>Our automated 3:00 AM NHTSA sweep identified <b>{len(new_recalls)} new safety recall campaign(s)</b> matching your monitored fleet:</p>
        <ul style="background-color: #f8fafc; padding: 15px 25px; border-radius: 6px;">
            {recall_items_html}
        </ul>
        <p style="margin-top: 20px;">
            <a href="https://tryrecalllogic.com" style="background-color: #06b6d4; color: #0f172a; font-weight: bold; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Launch Workspace & Schedule Repairs →
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 30px;" />
        <p style="font-size: 11px; color: #64748b;">Continuous Active Monitoring | RecallLogic Verified Safety Intelligence</p>
    </div>
    """

    # Example API call to Resend (https://resend.com)
    requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "from": "alerts@tryrecalllogic.com",
            "to": [to_email],
            "subject": f"⚠️ Operational Alert: {len(new_recalls)} New Recall(s) Identified for {company_name}",
            "html": html_content
        }
    )

def process_daily_alerts():
    """Finds new tasks created in the last 24 hours and dispatches alerts."""
    yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
    
    # 1. Fetch active profile subscribers with alerts enabled
    profiles = supabase.table("profiles")\
        .select("id, email, company_name, plan_type")\
        .neq("plan_type", "free")\
        .eq("email_alerts_enabled", True)\
        .execute().data

    for profile in profiles:
        # 2. Fetch new tasks generated for this user's vehicles in the last 24 hours
        tasks = supabase.table("recall_tasks")\
            .select("*, monitored_vehicles(unit_number, make, model)")\
            .eq("profile_id", profile["id"])\
            .gte("created_at", yesterday)\
            .execute().data

        if tasks:
            send_email_alert(profile["email"], profile.get("company_name", "Fleet Workspace"), tasks)
            # Update last alert timestamp
            supabase.table("profiles").update({"last_alert_sent_at": datetime.utcnow().isoformat()}).eq("id", profile["id"]).execute()

if __name__ == "__main__":
    process_daily_alerts()