import logging
import os
from typing import Optional, List, Dict, Any
import requests
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field

from app.services.fleetio_service import FleetioService

try:
    from app.engine import get_supabase_client
except ImportError:
    from supabase import create_client
    def get_supabase_client():
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
        return create_client(url, key)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/integrations/fleetio", tags=["Fleetio Integration"])


# =====================================================================
# NHTSA RECALL AUDIT HELPER
# =====================================================================
def check_vin_recalls(vin: str) -> List[Dict[str, Any]]:
    """
    Direct NHTSA API recall lookup for a given VIN.
    Normalizes the response into a structured list of defect dictionaries.
    """
    if not vin or len(vin) < 11:
        return []

    try:
        url = f"https://api.nhtsa.gov/recalls/recallsByVin?vin={vin}&issueType=r"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            raw_results = data.get("results") or []
            normalized = []
            for item in raw_results:
                campaign = item.get("NHTSACampaignNumber") or item.get("CampaignNumber") or "UNKNOWN"
                component = item.get("Component") or "SAFETY DEFECT"
                summary = item.get("Summary") or "Safety defect identified by NHTSA."
                remedy = item.get("Remedy") or "Contact authorized OEM dealer for remedy."
                normalized.append({
                    "campaign_number": campaign,
                    "component": component,
                    "summary": summary,
                    "remedy": remedy,
                    "status": "open"
                })
            return normalized
        else:
            logger.warning(f"NHTSA API returned status {response.status_code} for VIN {vin}")
    except Exception as e:
        logger.error(f"Error querying NHTSA for VIN {vin}: {e}")

    return []


# =====================================================================
# SINGLE VEHICLE AUDIT & PERSISTENCE HELPER
# =====================================================================
def audit_and_persist_single_vehicle(
    vehicle_dict: Dict[str, Any],
    api_token: Optional[str] = None,
    account_token: Optional[str] = None,
    organization_id: Optional[str] = None,
    profile_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Audits an individual vehicle from Fleetio against NHTSA, resolves existing
    Fleetio work order status, and upserts the result into Supabase.
    """
    vin = vehicle_dict.get("vin")
    if not vin:
        logger.warning("Vehicle missing VIN; skipping audit.")
        return None

    vin = vin.strip().upper()
    fleetio_veh_id = str(vehicle_dict.get("fleetio_id") or vehicle_dict.get("id", ""))
    
    resolved_api_key = api_token or os.getenv("FLEETIO_API_KEY")
    resolved_account_token = account_token or os.getenv("FLEETIO_ACCOUNT_TOKEN")

    fleetio = FleetioService(api_token=resolved_api_key, account_token=resolved_account_token)
    supabase = get_supabase_client()

    # 1. Query NHTSA safety defects
    recalls = check_vin_recalls(vin)
    active_recalls = [r for r in recalls if r.get("status") == "open"]

    has_defect = len(active_recalls) > 0
    primary_recall = active_recalls[0] if has_defect else {}

    component_str = primary_recall.get("component", "").lower()
    is_critical = any(
        kw in component_str
        for kw in ["brake", "steering", "airbag", "fire", "fuel", "suspension", "drag link"]
    )

    campaign_number = primary_recall.get("campaign_number", "CLEAN")
    component_display = primary_recall.get("component", "No Open NHTSA Defect Campaigns")
    defect_summary = f"{campaign_number} — {component_display}" if has_defect else "No Open NHTSA Defect Campaigns"

    fleetio_wo_id = None
    fleetio_issue_id = None
    is_remediated_in_fleetio = False

    # 2. Check existing Fleetio Work Orders before creating duplicates
    if fleetio_veh_id:
        existing_wos = fleetio.get_vehicle_work_orders(fleetio_veh_id)
        if existing_wos:
            latest_wo = existing_wos[0]
            wo_num = str(latest_wo.get("number") or latest_wo.get("id"))
            fleetio_wo_id = f"WO #{wo_num}"

            wo_status = ""
            if isinstance(latest_wo.get("work_order_status"), dict):
                wo_status = latest_wo["work_order_status"].get("name", "")
            else:
                wo_status = str(latest_wo.get("status", ""))

            if any(k in wo_status.lower() for k in ["complete", "closed"]):
                is_remediated_in_fleetio = True

    # 3. Create Work Order in Fleetio if defect is active and unassigned
    if has_defect and not fleetio_wo_id and fleetio_veh_id:
        try:
            wo_res = fleetio.create_work_order(fleetio_veh_id, primary_recall)
            if wo_res:
                fleetio_wo_id = f"WO #{wo_res.get('number', wo_res.get('id'))}"
        except Exception as wo_err:
            logger.error(f"Failed to dispatch Fleetio Work Order for {vin}: {wo_err}")

        try:
            fleetio_issue_id = fleetio.create_safety_recall_issue(fleetio_veh_id, primary_recall)
        except Exception as issue_err:
            logger.error(f"Failed to dispatch Fleetio Issue for {vin}: {issue_err}")

    # 4. Resolve Liability and Compliance Status
    if not has_defect or is_remediated_in_fleetio:
        compliance_status = "CLEARED"
        punitive_exposure = 0
        if is_remediated_in_fleetio:
            remedy_logistics = f"Closed in Fleetio ({fleetio_wo_id})"
        else:
            remedy_logistics = "NHTSA Safety Certified Defect-Free"
    else:
        compliance_status = "OPEN"
        punitive_exposure = 250000 if is_critical else 0
        remedy_logistics = "Fleetio Work Order Issued" if fleetio_wo_id else "Remediation Required"

    # 5. Persist record in Supabase
    unit_name = vehicle_dict.get("name") or vehicle_dict.get("unit_number") or f"UNIT-{vin[-4:]}"
    make_name = vehicle_dict.get("make") or "COMMERCIAL"
    model_name = vehicle_dict.get("model") or "POWER UNIT"
    year_val = vehicle_dict.get("year") or 2023
    meter_reading = vehicle_dict.get("meter_reading") or vehicle_dict.get("primary_meter_value")

    vehicle_data = {
        "vin": vin,
        "unit_number": unit_name,
        "make": str(make_name).upper(),
        "model": str(model_name).upper(),
        "year": int(year_val) if str(year_val).isdigit() else 2023,
        "fleetio_vehicle_id": fleetio_veh_id,
        "fleetio_meter_reading": meter_reading,
        "campaign_id": campaign_number,
        "safety_recall_details": defect_summary,
        "compliance_status": compliance_status,
        "punitive_exposure": punitive_exposure,
        "remedy_logistics": remedy_logistics,
        "work_order_id": fleetio_wo_id,
        "organization_id": organization_id,
        "profile_id": profile_id,
    }

    vehicle_res = (
        supabase.table("monitored_vehicles")
        .upsert(vehicle_data, on_conflict="vin")
        .execute()
    )

    if vehicle_res.data and has_defect:
        saved_vehicle_id = vehicle_res.data[0]["id"]
        task_data = {
            "vehicle_id": saved_vehicle_id,
            "campaign_number": campaign_number,
            "component": primary_recall.get("component"),
            "summary": primary_recall.get("summary"),
            "remedy": primary_recall.get("remedy"),
            "severity_score": 9.5 if is_critical else 6.0,
            "nuclear_liability_flag": is_critical,
            "fleetio_issue_id": fleetio_issue_id,
            "status": "closed" if is_remediated_in_fleetio else "open",
        }
        supabase.table("recall_tasks").upsert(
            task_data, on_conflict="vehicle_id,campaign_number"
        ).execute()

    logger.info(f"Audited VIN {vin}: Status={compliance_status}, Exposure=${punitive_exposure:,}")
    return vehicle_data


# =====================================================================
# BACKGROUND BATCH SYNC TASK
# =====================================================================
def run_fleetio_sync_task(
    api_token: Optional[str] = None,
    account_token: Optional[str] = None,
    organization_id: Optional[str] = None,
    profile_id: Optional[str] = None
):
    """
    Background worker that fetches vehicles from Fleetio, checks NHTSA recalls,
    respects completed work orders, and synchronizes fleet state to Supabase.
    """
    try:
        resolved_api_key = api_token or os.getenv("FLEETIO_API_KEY")
        resolved_account_token = account_token or os.getenv("FLEETIO_ACCOUNT_TOKEN")

        fleetio = FleetioService(api_token=resolved_api_key, account_token=resolved_account_token)
        vehicles = fleetio.fetch_active_vehicles()

        synced_count = 0
        for v in vehicles:
            if v.get("vin"):
                audit_and_persist_single_vehicle(
                    vehicle_dict=v,
                    api_token=resolved_api_key,
                    account_token=resolved_account_token,
                    organization_id=organization_id,
                    profile_id=profile_id
                )
                synced_count += 1

        logger.info(f"Fleetio batch sync finished: {synced_count} vehicles audited.")
    except Exception as e:
        logger.error(f"Error during Fleetio background sync: {str(e)}", exc_info=True)


# =====================================================================
# REQUEST BODY MODEL
# =====================================================================
class FleetioSyncRequest(BaseModel):
    api_token: Optional[str] = Field(None, description="Fleetio API User Key/Token (defaults to env)")
    account_token: Optional[str] = Field(None, description="Fleetio Account Token (defaults to env)")
    organization_id: Optional[str] = Field(None, description="Supabase Organization ID")
    profile_id: Optional[str] = Field(None, description="Supabase Profile ID")


# =====================================================================
# FASTAPI ENDPOINTS
# =====================================================================
@router.post("/sync")
async def sync_fleetio_fleet(
    payload: FleetioSyncRequest,
    background_tasks: BackgroundTasks
):
    """
    Manual/Cron API trigger to run a full fleet sync against Fleetio and NHTSA.
    """
    resolved_api_key = payload.api_token or os.getenv("FLEETIO_API_KEY")
    resolved_account_token = payload.account_token or os.getenv("FLEETIO_ACCOUNT_TOKEN")

    if not resolved_api_key or not resolved_account_token:
        raise HTTPException(
            status_code=400,
            detail="Missing Fleetio credentials. Provide them in request or configure FLEETIO_API_KEY and FLEETIO_ACCOUNT_TOKEN."
        )

    try:
        fleetio = FleetioService(api_token=resolved_api_key, account_token=resolved_account_token)
        _ = fleetio.fetch_active_vehicles()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Fleetio API connection or authentication failed: {str(e)}"
        )

    background_tasks.add_task(
        run_fleetio_sync_task,
        api_token=resolved_api_key,
        account_token=resolved_account_token,
        organization_id=payload.organization_id,
        profile_id=payload.profile_id
    )

    return {
        "status": "processing",
        "message": "Fleetio sync running in background. Vehicles and Work Orders are updating."
    }


@router.post("/webhook")
async def fleetio_webhook_listener(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Unified Fleetio Webhook Listener:
    1. Handles vehicle.created / vehicle.updated -> Triggers instant NHTSA recall audit.
    2. Handles work_order.updated / work_order.closed -> Updates compliance status and punitive exposure.
    """
    try:
        payload = await request.json()
        event_type = str(payload.get("event") or "").lower()
        data = payload.get("data") or payload

        # -------------------------------------------------------------
        # 1. EVENT: Vehicle Lifecycle (Created, Updated)
        # -------------------------------------------------------------
        is_vehicle_event = (
            "vehicle" in event_type
            or (isinstance(data, dict) and data.get("vin") and not data.get("work_order_status"))
        )

        if is_vehicle_event:
            vin = data.get("vin")
            if vin:
                logger.info(f"Fleetio Webhook: Vehicle lifecycle event ('{event_type}') received for VIN {vin}.")
                background_tasks.add_task(audit_and_persist_single_vehicle, data)
                return {"received": True, "action": "vehicle_audit_queued"}

        # -------------------------------------------------------------
        # 2. EVENT: Work Order Lifecycle (Updated, Closed, Completed)
        # -------------------------------------------------------------
        if isinstance(data, dict) and (data.get("work_order_status") or "work_order" in event_type or data.get("status")):
            status_name = ""
            if isinstance(data.get("work_order_status"), dict):
                status_name = data["work_order_status"].get("name", "")
            else:
                status_name = str(data.get("status", ""))

            status_lower = status_name.lower()
            is_completed = any(k in status_lower for k in ["complete", "closed"])
            wo_identifier = str(data.get("number") or data.get("id", ""))

            supabase = get_supabase_client()

            if is_completed and wo_identifier:
                # Mark vehicle as cleared and zero out punitive liability
                supabase.table("monitored_vehicles").update({
                    "compliance_status": "CLEARED",
                    "punitive_exposure": 0,
                    "remedy_logistics": f"Closed in Fleetio (WO #{wo_identifier})",
                }).ilike("work_order_id", f"%{wo_identifier}%").execute()

                logger.info(f"Fleetio Webhook: Work Order #{wo_identifier} marked {status_name}. Cleared punitive exposure.")
                return {"received": True, "action": "liability_cleared"}

            elif any(k in status_lower for k in ["open", "in progress"]) and wo_identifier:
                # If a work order was re-opened, trigger re-evaluation
                veh_id = data.get("vehicle_id")
                if veh_id:
                    fleetio = FleetioService()
                    # Re-audit vehicle to restore exposure if an active safety defect remains
                    try:
                        veh_record = fleetio.fetch_active_vehicles()
                        matching = [v for v in veh_record if str(v.get("fleetio_id")) == str(veh_id)]
                        if matching:
                            background_tasks.add_task(audit_and_persist_single_vehicle, matching[0])
                    except Exception as err:
                        logger.error(f"Error fetching vehicle during work order reopening: {err}")

                return {"received": True, "action": "work_order_reopened"}

        return {"received": True, "action": "ignored"}
    except Exception as err:
        logger.error(f"Error handling Fleetio webhook: {err}", exc_info=True)
        return {"received": True}