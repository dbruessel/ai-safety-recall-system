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


def check_vin_recalls(vin: str) -> List[Dict[str, Any]]:
    """
    Direct NHTSA API recall lookup for a given VIN.
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


class FleetioSyncRequest(BaseModel):
    api_token: Optional[str] = Field(None, description="Fleetio API User Key/Token (defaults to env)")
    account_token: Optional[str] = Field(None, description="Fleetio Account Token (defaults to env)")
    organization_id: Optional[str] = Field(None, description="Supabase Organization ID")
    profile_id: Optional[str] = Field(None, description="Supabase Profile ID")


def run_fleetio_sync_task(
    api_token: Optional[str] = None,
    account_token: Optional[str] = None,
    organization_id: Optional[str] = None,
    profile_id: Optional[str] = None
):
    """
    Background worker that fetches vehicles from Fleetio, checks NHTSA recalls,
    respects existing completed Fleetio work orders, and synchronizes state to Supabase.
    """
    try:
        resolved_api_key = api_token or os.getenv("FLEETIO_API_KEY")
        resolved_account_token = account_token or os.getenv("FLEETIO_ACCOUNT_TOKEN")

        fleetio = FleetioService(api_token=resolved_api_key, account_token=resolved_account_token)
        vehicles = fleetio.fetch_active_vehicles()
        supabase = get_supabase_client()

        synced_count = 0
        recalls_flagged = 0

        for v in vehicles:
            vin = v.get("vin")
            fleetio_veh_id = v.get("fleetio_id")
            if not vin:
                continue

            # 1. Query NHTSA recalls
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
            is_remediated_in_fleetio = False

            # 2. Check existing Fleetio Work Orders before creating duplicates
            existing_wos = fleetio.get_vehicle_work_orders(fleetio_veh_id)
            if existing_wos:
                # Find the most relevant work order (or latest)
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

            # 3. If defect exists but has no work order yet in Fleetio, create one
            if has_defect and not fleetio_wo_id:
                recalls_flagged += 1
                try:
                    wo_res = fleetio.create_work_order(fleetio_veh_id, primary_recall)
                    if wo_res:
                        fleetio_wo_id = f"WO #{wo_res.get('number', wo_res.get('id'))}"
                except Exception as wo_err:
                    logger.error(f"Failed to dispatch Fleetio Work Order for {vin}: {wo_err}")

                try:
                    fleetio.create_safety_recall_issue(fleetio_veh_id, primary_recall)
                except Exception as issue_err:
                    logger.error(f"Failed to dispatch Fleetio Issue for {vin}: {issue_err}")

            # 4. Resolve Compliance & Punitive Liability Status
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
                recalls_flagged += 1

            # 5. Persist to monitored_vehicles
            vehicle_data = {
                "vin": vin,
                "unit_number": v.get("name") or f"UNIT-{vin[-4:]}",
                "make": (v.get("make") or "COMMERCIAL").upper(),
                "model": (v.get("model") or "POWER UNIT").upper(),
                "year": v.get("year") or 2023,
                "fleetio_vehicle_id": fleetio_veh_id,
                "fleetio_meter_reading": v.get("meter_reading"),
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

            if not vehicle_res.data:
                logger.warning(f"Failed to upsert vehicle record with VIN: {vin}")
                continue

            synced_count += 1

        logger.info(f"Fleetio sync completed: {synced_count} vehicles processed, {recalls_flagged} defects flagged.")

    except Exception as e:
        logger.error(f"Error during Fleetio background sync: {str(e)}", exc_info=True)


@router.post("/sync")
async def sync_fleetio_fleet(
    payload: FleetioSyncRequest,
    background_tasks: BackgroundTasks
):
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
async def fleetio_webhook_listener(request: Request):
    """
    Webhook endpoint listening for Fleetio work_order.updated events.
    """
    try:
        payload = await request.json()
        work_order = payload.get("data") or payload

        status_name = ""
        if isinstance(work_order.get("work_order_status"), dict):
            status_name = work_order["work_order_status"].get("name", "")
        else:
            status_name = str(work_order.get("status", ""))

        is_completed = any(k in status_name.lower() for k in ["complete", "closed"])

        if is_completed and work_order.get("id"):
            wo_identifier = str(work_order.get("number") or work_order.get("id"))
            supabase = get_supabase_client()

            supabase.table("monitored_vehicles").update({
                "compliance_status": "CLEARED",
                "punitive_exposure": 0,
                "remedy_logistics": f"Closed in Fleetio (WO #{wo_identifier})",
            }).ilike("work_order_id", f"%{wo_identifier}%").execute()

            logger.info(f"Fleetio Webhook: Closed Work Order #{wo_identifier}, cleared punitive exposure.")

        return {"received": True}
    except Exception as err:
        logger.error(f"Error handling Fleetio webhook: {err}")
        return {"received": True}