import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from app.services.fleetio_service import FleetioService
from app.services.recall_service import check_vin_recalls  # Existing recall lookup service
from app.engine import get_supabase_client  # Existing Supabase connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/integrations/fleetio", tags=["Fleetio Integration"])


# 1. Pydantic Model for JSON Request Body
class FleetioSyncRequest(BaseModel):
    api_token: str = Field(..., description="Fleetio API User Key/Token")
    account_token: str = Field(..., description="Fleetio Account Token")
    organization_id: str = Field(..., description="Supabase Organization ID")
    profile_id: str = Field(..., description="Supabase Profile ID")


# 2. Asynchronous Processing Worker
def run_fleetio_sync_task(api_token: str, account_token: str, organization_id: str, profile_id: str):
    """
    Background worker that fetches vehicles from Fleetio, checks NHTSA recalls,
    and updates both Supabase tables and Fleetio Issues asynchronously.
    """
    try:
        fleetio = FleetioService(api_token=api_token, account_token=account_token)
        vehicles = fleetio.fetch_active_vehicles()
        supabase = get_supabase_client()

        synced_count = 0
        recalls_flagged = 0

        for v in vehicles:
            vin = v.get("vin")
            if not vin:
                continue

            # Step 1: Upsert vehicle into monitored_vehicles
            vehicle_data = {
                "organization_id": organization_id,
                "profile_id": profile_id,  # Included profile_id for schema constraints
                "vin": vin,
                "make": v.get("make"),
                "model": v.get("model"),
                "year": v.get("year"),
                "fleetio_vehicle_id": v.get("fleetio_id"),
                "fleetio_meter_reading": v.get("meter_reading"),
            }

            vehicle_res = (
                supabase.table("monitored_vehicles")
                .upsert(vehicle_data, on_conflict="vin")
                .execute()
            )

            if not vehicle_res.data:
                logger.warning(f"Failed to upsert vehicle with VIN: {vin}")
                continue

            vehicle_id = vehicle_res.data[0]["id"]
            synced_count += 1

            # Step 2: Perform NHTSA Recall Lookup
            recalls = check_vin_recalls(vin)
            for recall in recalls:
                if recall.get("status") == "open":
                    recalls_flagged += 1

                    # Evaluate critical safety-impact keywords
                    component_str = recall.get("component", "").lower()
                    is_nuclear = any(
                        kw in component_str
                        for kw in ["brake", "steering", "airbag", "fire", "fuel", "suspension"]
                    )

                    # Step 3: Trigger urgent Fleetio Issue for high-severity components
                    fleetio_issue_id = None
                    if is_nuclear:
                        try:
                            fleetio_issue_id = fleetio.create_safety_recall_issue(
                                v.get("fleetio_id"), recall
                            )
                        except Exception as fleetio_err:
                            logger.error(
                                f"Failed to push Fleetio issue for VIN {vin}: {fleetio_err}"
                            )

                    # Step 4: Record or update task entry in recall_tasks
                    task_data = {
                        "vehicle_id": vehicle_id,
                        "campaign_number": recall.get("campaign_number"),
                        "component": recall.get("component"),
                        "summary": recall.get("summary"),
                        "remedy": recall.get("remedy"),
                        "severity_score": 9.5 if is_nuclear else 6.0,
                        "nuclear_liability_flag": is_nuclear,
                        "fleetio_issue_id": fleetio_issue_id,
                        "status": "open",
                    }

                    supabase.table("recall_tasks").upsert(
                        task_data, on_conflict="vehicle_id,campaign_number"
                    ).execute()

        logger.info(
            f"Fleetio background sync completed: {synced_count} vehicles synced, "
            f"{recalls_flagged} active recalls flagged for Organization ID {organization_id}."
        )

    except Exception as e:
        logger.error(f"Error during Fleetio background processing: {str(e)}", exc_info=True)


# 3. FastAPI Endpoint Route Handler
@router.post("/sync")
async def sync_fleetio_fleet(
    payload: FleetioSyncRequest,
    background_tasks: BackgroundTasks
):
    """
    Initializes a fleet sync from Fleetio asynchronously.
    Reads configuration via JSON Request Body and delegates processing to BackgroundTasks.
    """
    # 1. Immediate API credentials check
    try:
        fleetio = FleetioService(api_token=payload.api_token, account_token=payload.account_token)
        _ = fleetio.fetch_active_vehicles()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Fleetio API connection or authentication failed: {str(e)}"
        )

    # 2. Dispatch processing loop to background worker
    background_tasks.add_task(
        run_fleetio_sync_task,
        api_token=payload.api_token,
        account_token=payload.account_token,
        organization_id=payload.organization_id,
        profile_id=payload.profile_id
    )

    return {
        "status": "processing",
        "message": "Fleetio sync initialized. Vehicle data and recall tasks are updating in the background."
    }