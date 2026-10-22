import os
import logging
import requests
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Initialize Supabase Service Client
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip()
SUPABASE_SERVICE_KEY = (
    os.getenv("SUPABASE_SERVICE_KEY") 
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY") 
    or os.getenv("SUPABASE_KEY") 
    or ""
).strip()

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Email Dispatch Configuration
RESEND_API_KEY = (os.getenv("RESEND_API_KEY") or "").strip()
ALERT_FROM_EMAIL = (os.getenv("ALERT_FROM_EMAIL") or "RecallLogic Alerts <alerts@recalllogic.ai>").strip()


def fetch_new_recall_tasks(days_back: int = 1) -> List[Dict[str, Any]]:
    """
    Fetches open recall tasks detected or updated within the last N days.
    """
    cutoff_time = (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat()
    logger.info(f"Scanning for recall tasks recorded since {cutoff_time}...")

    try:
        response = (
            supabase.table("recall_tasks")
            .select("id, campaign_number, component, summary, severity_score, created_at, vehicle_id, status")
            .gte("created_at", cutoff_time)
            .execute()
        )
        tasks = response.data or []
        logger.info(f"Retrieved {len(tasks)} recall task(s) for alert processing.")
        return tasks
    except Exception as e:
        logger.error(f"Error fetching recall tasks: {e}")
        return []


def get_vehicle_and_recipient(vehicle_id: str) -> Optional[Dict[str, Any]]:
    """
    Resolves the vehicle metadata and recipient profile from monitored_vehicles or fleet_assets.
    """
    try:
        # Check monitored_vehicles first
        veh_res = (
            supabase.table("monitored_vehicles")
            .select("vin, make, model, year, profile_id")
            .eq("id", vehicle_id)
            .maybe_single()
            .execute()
        )
        vehicle = veh_res.data if veh_res else None

        # Fallback to fleet_assets if not found in monitored_vehicles
        if not vehicle:
            asset_res = (
                supabase.table("fleet_assets")
                .select("vin, make, model, year, profile_id")
                .eq("id", vehicle_id)
                .maybe_single()
                .execute()
            )
            vehicle = asset_res.data if asset_res else None

        if not vehicle or not vehicle.get("profile_id"):
            logger.warning(f"No asset record or profile_id found for vehicle_id: {vehicle_id}")
            return None

        # Fetch profile email & fleet name
        profile_res = (
            supabase.table("profiles")
            .select("email, company_name")
            .eq("id", vehicle["profile_id"])
            .maybe_single()
            .execute()
        )
        profile = profile_res.data if profile_res else None

        if not profile or not profile.get("email"):
            logger.warning(f"No profile email found for profile_id: {vehicle.get('profile_id')}")
            return None

        return {
            "email": profile["email"],
            "company_name": profile.get("company_name") or "Commercial Fleet",
            "vin": vehicle.get("vin") or "UNKNOWN_VIN",
            "vehicle_name": f"{vehicle.get('year', '')} {vehicle.get('make', '')} {vehicle.get('model', '')}".strip() or "Fleet Asset",
        }
    except Exception as e:
        logger.error(f"Error resolving vehicle/recipient for vehicle_id {vehicle_id}: {e}")
        return None


def send_hazard_alert_email(recipient_email: str, company_name: str, vehicle_name: str, vin: str, task: Dict[str, Any]) -> bool:
    """
    Dispatches an underwriter loss-control early-warning notice via Resend API.
    """
    if not RESEND_API_KEY:
        logger.error("RESEND_API_KEY is missing. Alert email skipped.")
        return False

    campaign = task.get("campaign_number") or "NHTSA Recall"
    component = task.get("component") or "Critical Safety System"
    summary = task.get("summary") or "Safety defect reported by manufacturer."
    severity_score = float(task.get("severity_score") or 5.0)

    is_nuclear = severity_score >= 8.0 or any(kw in component.lower() for kw in ["steering", "brake", "fire"])
    exposure_amount = "$250,000" if is_nuclear else "$50,000"

    subject = f"🚨 {'CRITICAL NUCLEAR DEFECT' if is_nuclear else 'SAFETY RECALL'}: {campaign} on {vin[-6:]}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f1f5f9; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #0d1322; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; }}
            .badge {{ display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 6px; text-transform: uppercase; }}
            .nuclear-badge {{ background: #450a0a; color: #f87171; border: 1px solid #ef4444; }}
            .standard-badge {{ background: #172554; color: #60a5fa; border: 1px solid #3b82f6; }}
            .threat-card {{ background: #070b14; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .exposure-tag {{ color: #ef4444; font-size: 14px; font-weight: bold; margin-top: 8px; }}
            .cta-btn {{ display: inline-block; background: #06b6d4; color: #020617; text-decoration: none; font-weight: bold; padding: 10px 18px; border-radius: 6px; font-size: 13px; margin-top: 12px; }}
            .footer {{ font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 12px; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div style="margin-bottom: 12px;">
                <span class="badge {'nuclear-badge' if is_nuclear else 'standard-badge'}">
                    {'⚠️ NUCLEAR LIABILITY THREAT' if is_nuclear else 'NHTSA SAFETY ADVISORY'}
                </span>
            </div>
            
            <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #ffffff;">RecallLogic Loss-Control Alert</h2>
            <p style="font-size: 13px; color: #94a3b8; margin: 0 0 16px 0;">Automated Asset Risk & Mechanical Defense Notification</p>

            <div class="threat-card">
                <div style="font-size: 13px; font-weight: bold; color: #f8fafc;">{vehicle_name}</div>
                <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">VIN: <code>{vin}</code> | Account: {company_name}</div>
                
                <div style="font-size: 13px; color: #e2e8f0; font-weight: 600;">Campaign #{campaign} — {component}</div>
                <p style="font-size: 12px; color: #94a3b8; margin: 6px 0 0 0; line-height: 1.4;">{summary}</p>
                
                <div class="exposure-tag">
                    Calculated Punitive Risk: {exposure_amount} out-of-pocket exposure
                </div>
            </div>

            <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
                Operating this commercial asset with an active manufacturer defect establishes proof of negligent maintenance post-incident. Push this remediation work order directly into Fleetio to protect policy loss ratios and maintain underwriter rate credits.
            </p>

            <a href="https://recalllogic.ai/taskboard/demo" class="cta-btn">Remediate in Fleetio Workspace &rarr;</a>

            <div class="footer">
                RecallLogic Inc. • InsurTech Loss-Control Engine • Automated NHTSA & OEM Defense
            </div>
        </div>
    </body>
    </html>
    """

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": ALERT_FROM_EMAIL,
                "to": [recipient_email],
                "subject": subject,
                "html": html_content,
            },
            timeout=10,
        )

        if response.status_code in [200, 201]:
            logger.info(f"✅ Dispatched alert email to {recipient_email} for VIN {vin} (Campaign: {campaign})")
            return True
        else:
            logger.error(f"Resend API error ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        logger.error(f"Failed to dispatch email via Resend: {e}")
        return False


def process_daily_alerts():
    """
    Scans for recently generated recall tasks, aggregates asset records,
    and dispatches underwriter hazard notices to fleet administrators.
    """
    logger.info("Starting automated hazard detection alert cycle...")

    tasks = fetch_new_recall_tasks(days_back=1)

    if not tasks:
        logger.info("No active recall tasks generated in the last 24 hours. No alerts required.")
        return

    critical_count = sum(1 for t in tasks if (t.get("severity_score") or 0) >= 8.0)
    logger.info(f"Found {len(tasks)} tasks ({critical_count} critical) requiring evaluation.")

    dispatched_count = 0

    for task in tasks:
        vehicle_id = task.get("vehicle_id")
        if not vehicle_id:
            continue

        recipient_data = get_vehicle_and_recipient(vehicle_id)
        if not recipient_data:
            continue

        sent = send_hazard_alert_email(
            recipient_email=recipient_data["email"],
            company_name=recipient_data["company_name"],
            vehicle_name=recipient_data["vehicle_name"],
            vin=recipient_data["vin"],
            task=task,
        )

        if sent:
            dispatched_count += 1

    logger.info(f"SUCCESS: Alert cycle finished. Successfully dispatched {dispatched_count} notifications.")


if __name__ == "__main__":
    process_daily_alerts()