from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.services.fleetio_service import FleetioService
from app.services.recall_service import check_vin_recalls # Existing recall lookup service
from app.engine import get_supabase_client # Existing Supabase connection

router = APIRouter(prefix="/api/v1/integrations/fleetio", tags=["Fleetio Integration"])

@router.post("/sync")
async def sync_fleetio_fleet(
    api_token: str, 
    account_token: str, 
    organization_id: str,
    background_tasks: BackgroundTasks
):
    """
    1. Fetches active VINs from Fleetio.
    2. Upserts vehicles into `monitored_vehicles`.
    3. Runs NHTSA recall checks against each VIN.
    4. Creates `recall_tasks` and pushes high-priority Issues back into Fleetio.
    """
    fleetio = FleetioService(api_token=api_token, account_token=account_token)
    try:
        vehicles = fleetio.fetch_active_vehicles()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Fleetio API connection failed: {str(e)}")

    supabase = get_supabase_client()
    synced_count = 0
    recalls_flagged = 0

    for v in vehicles:
        vin = v.get("vin")
        if not vin:
            continue

        # 1. Upsert into monitored_vehicles
        vehicle_data = {
            "organization_id": organization_id,
            "vin": vin,
            "make": v.get("make"),
            "model": v.get("model"),
            "year": v.get("year"),
            "fleetio_vehicle_id": v.get("fleetio_id"),
            "fleetio_meter_reading": v.get("meter_reading"),
        }
        
        vehicle_res = supabase.table("monitored_vehicles").upsert(
            vehicle_data, on_conflict="vin"
        ).execute()

        vehicle_id = vehicle_res.data[0]["id"]
        synced_count += 1

        # 2. Check for NHTSA Recalls
        recalls = check_vin_recalls(vin)
        for recall in recalls:
            if recall.get("status") == "open":
                recalls_flagged += 1
                
                # Check for critical liability keywords
                is_nuclear = any(
                    kw in recall.get("component", "").lower() 
                    for kw in ["brake", "steering", "airbag", "fire", "fuel", "suspension"]
                )

                # 3. Create issue in Fleetio if high severity
                fleetio_issue_id = None
                if is_nuclear:
                    fleetio_issue_id = fleetio.create_safety_recall_issue(
                        v.get("fleetio_id"), recall
                    )

                # 4. Insert into Supabase recall_tasks
                task_data = {
                    "vehicle_id": vehicle_id,
                    "campaign_number": recall.get("campaign_number"),
                    "component": recall.get("component"),
                    "summary": recall.get("summary"),
                    "remedy": recall.get("remedy"),
                    "severity_score": 9.5 if is_nuclear else 6.0,
                    "nuclear_liability_flag": is_nuclear,
                    "fleetio_issue_id": fleetio_issue_id,
                    "status": "open"
                }
                supabase.table("recall_tasks").upsert(
                    task_data, on_conflict="vehicle_id,campaign_number"
                ).execute()

    return {
        "status": "success",
        "vehicles_synced": synced_count,
        "active_recalls_identified": recalls_flagged
    }