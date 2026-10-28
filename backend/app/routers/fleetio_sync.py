import logging
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field

from app.services.fleetio_service import FleetioService
from app.services.recall_service import check_vin_recalls
from app.engine import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/integrations/fleetio", tags=["Fleetio Integration"])


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
    dispatches Fleetio Work Orders, and synchronizes state to Supabase.
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
            if not vin:
                continue

            # Query NHTSA recalls
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

            # Dispatch Work Order and Issue to Fleetio if defect is detected
            if has_defect:
                recalls_flagged += 1
                try:
                    wo_res = fleetio.create_work_order(v.get("fleetio_id"), primary_recall)
                    if wo_res:
                        fleetio_wo_id = f"WO #{wo_res.get('number', wo_res.get('id'))}"
                except Exception as wo_err:
                    logger.error(f"Failed to dispatch Fleetio Work Order for {vin}: {wo_err}")

                try:
                    fleetio_issue_id = fleetio.create_safety_recall_issue(v.get("fleetio_id"), primary_recall)
                except Exception as issue_err:
                    logger.error(f"Failed to dispatch Fleetio Issue for {vin}: {issue_err}")

            compliance_status = "OPEN" if has_defect else "CLEARED"
            punitive_exposure = 250000 if (has_defect and is_critical) else 0
            remedy_logistics = "Fleetio Work Order Issued" if fleetio_wo_id else ("NHTSA Safety Certified Defect-Free" if not has_defect else "Remediation Required")

            # Persist to monitored_vehicles for the dashboard
            vehicle_data = {
                "vin": vin,
                "unit_number": v.get("name") or f"UNIT-{vin[-4:]}",
                "make": (v.get("make") or "COMMERCIAL").upper(),
                "model": (v.get("model") or "POWER UNIT").upper(),
                "year": v.get("year") or 2023,
                "fleetio_vehicle_id": v.get("fleetio_id"),
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

            saved_vehicle_id = vehicle_res.data[0]["id"]
            synced_count += 1

            # Update recall_tasks table for granular audit tracking
            if has_defect:
                task_data = {
                    "vehicle_id": saved_vehicle_id,
                    "campaign_number": campaign_number,
                    "component": primary_recall.get("component"),
                    "summary": primary_recall.get("summary"),
                    "remedy": primary_recall.get("remedy"),
                    "severity_score": 9.5 if is_critical else 6.0,
                    "nuclear_liability_flag": is_critical,
                    "fleetio_issue_id": fleetio_issue_id,
                    "status": "open",
                }
                supabase.table("recall_tasks").upsert(
                    task_data, on_conflict="vehicle_id,campaign_number"
                ).execute()

        logger.info(f"Fleetio sync completed: {synced_count} vehicles processed, {recalls_flagged} defects flagged.")

    except Exception as e:
        logger.error(f"Error during Fleetio background sync: {str(e)}", exc_info=True)


@router.post("/sync")
async def sync_fleetio_fleet(
    payload: FleetioSyncRequest,
    background_tasks: BackgroundTasks
):
    """
    Initializes a fleet sync from Fleetio. If tokens are omitted, reads them from env.
    """
    resolved_api_key = payload.api_token or os.getenv("FLEETIO_API_KEY")
    resolved_account_token = payload.account_token or os.getenv("FLEETIO_ACCOUNT_TOKEN")

    if not resolved_api_key or not resolved_account_token:
        raise HTTPException(
            status_code=400,
            detail="Missing Fleetio credentials. Provide them in the request body or configure FLEETIO_API_KEY and FLEETIO_ACCOUNT_TOKEN."
        )

    # Validate connectivity
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
    Webhook endpoint to catch Fleetio work_order.updated events.
    When a work order is completed or closed in Fleetio, resets punitive exposure to $0.
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

            # Clear exposure in Supabase
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