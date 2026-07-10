import logging
import httpx
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from app.config import settings

logger = logging.getLogger("dashboard-router")

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# =====================================================================
# DATA VALIDATION SCHEMAS
# =====================================================================

class VehicleAddRequest(BaseModel):
    vin: str
    user_id: str  # In production, this will be resolved via your Auth token middleware [cite: 30]

class TaskStatusUpdateRequest(BaseModel):
    status: str  # 'pending', 'scheduled', or 'repaired' [cite: 37]
    scheduled_repair_date: Optional[str] = None

# =====================================================================
# ENDPOINT 1: ADD VEHICLE & AUTOMATICALLY GENERATE RECALL TASKS
# =====================================================================
@router.post("/vehicles", status_code=status.HTTP_201_CREATED)
async def add_monitored_vehicle(payload: VehicleAddRequest):
    """
    1. Adds a 17-digit VIN to the user's active fleet list.
    2. Decodes the VIN via NHTSA vPIC [cite: 20].
    3. Finds matching safety campaigns in your database [cite: 22].
    4. Automatically generates 'pending' task cards for each campaign [cite: 37].
    """
    from supabase import create_client, Client
    sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)
    
    clean_vin = payload.vin.strip().upper()
    if len(clean_vin) != 17:
        raise HTTPException(status_code=400, detail="VIN must be exactly 17 characters.")

    # Step A: Decode VIN via NHTSA [cite: 20]
    vpic_url = f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{clean_vin}?format=json"
    try:
        async with httpx.AsyncClient() as client:
            vpic_response = await client.get(vpic_url, timeout=5.0)
            vpic_response.raise_for_status()
            vpic_data = vpic_response.json()
            
        results = vpic_data.get("Results", [])
        if not results or not isinstance(results, list) or len(results) == 0:
            raise HTTPException(status_code=404, detail="VIN could not be decoded.")
            
        decoded = results.pop(0)
        make = decoded.get("Make", "").strip()
        model = decoded.get("Model", "").strip()
        year_str = decoded.get("ModelYear", "").strip()
        
        if not make or not model or not year_str:
            raise HTTPException(status_code=422, detail="Incomplete attributes resolved from VIN.")
        year = int(year_str)
    except Exception as e:
        logger.error(f"VIN Decode failed: {str(e)}")
        raise HTTPException(status_code=502, detail="Federal decoder handshake failed.")

    # Step B: Write to monitored_vehicles table [cite: 50]
    try:
        vehicle_payload = {
            "profile_id": payload.user_id,
            "vin": clean_vin,
            "make": make,
            "model": model,
            "year": year
        }
        vehicle_res = sb.table("monitored_vehicles").insert(vehicle_payload).execute()
        new_vehicle = vehicle_res.data
        vehicle_id = new_vehicle["id"]
    except Exception as e:
        logger.error(f"Failed to insert vehicle: {str(e)}")
        raise HTTPException(status_code=409, detail="Vehicle is already being monitored in this fleet.")

    # Step C: Query your central database for active recalls on this Make/Model/Year [cite: 22]
    try:
        recalls_res = sb.table("recall_results").select("*") \
            .ilike("make", make) \
            .ilike("model", model) \
            .eq("year", str(year)) \
            .execute()
        active_recalls = recalls_res.data or []
    except Exception as e:
        logger.error(f"Failed querying safety threats: {str(e)}")
        # Vehicle was added, but we failed to scan. Return success, but flag the scanning issue.
        return {"status": "warning", "message": "Vehicle added, but initial scan deferred.", "vehicle": new_vehicle}

    # Step D: Bulk insert safety campaigns as 'pending' tasks for the user [cite: 37]
    tasks_to_insert = []
    for r in active_recalls:
        tasks_to_insert.append({
            "vehicle_id": vehicle_id,
            "campaign_number": r["campaign_number"],
            "component": r.get("component", "UNKNOWN"),
            "summary": r.get("summary", ""),
            "remedy": r.get("remedy", ""),
            "severity_score": r.get("calculated_severity_score", 50.0),
            "status": "pending"  # Task starts in 'pending' status [cite: 37]
        })

    if tasks_to_insert:
        try:
            sb.table("recall_tasks").insert(tasks_to_insert).execute() [cite: 50]
        except Exception as e:
            logger.error(f"Failed to populate threat tasks: {str(e)}")

    return {
        "status": "success",
        "message": f"Successfully onboarded vehicle. Flagged {len(tasks_to_insert)} pending safety tasks.",
        "vehicle": new_vehicle,
        "tasks_count": len(tasks_to_insert)
    }

# =====================================================================
# ENDPOINT 2: GET ALL MONITORED VEHICLES (FLEET REGISTER)
# =====================================================================
@router.get("/vehicles", response_model=List[dict])
def get_fleet_vehicles(user_id: str):
    from supabase import create_client, Client
    sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)
    
    res = sb.table("monitored_vehicles").select("*").eq("profile_id", user_id).execute() [cite: 50]
    return res.data or []

# =====================================================================
# ENDPOINT 3: GET THE RECALL TASK BOARD (KANBAN FEED)
# =====================================================================
@router.get("/tasks", response_model=List[dict])
def get_recall_tasks(user_id: str):
    """
    Fetches all active recall tasks for a user's vehicles.
    Perfect for organizing into 'Pending', 'Scheduled', and 'Repaired' dashboard columns [cite: 37]!
    """
    from supabase import create_client, Client
    sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)
    
    # Run an inner join query utilizing PostgreSQL relationships
    res = sb.table("recall_tasks").select(
        "*, monitored_vehicles(vin, make, model, year)"
    ).execute()
    
    # Filter on python-side or use Supabase join-filtering to ensure users only see their own tasks
    filtered_tasks = [
        task for task in (res.data or [])
        if task.get("monitored_vehicles", {}).get("profile_id") == user_id
    ]
    return filtered_tasks

# =====================================================================
# ENDPOINT 4: UPDATE RECALL TASK STATE (THE KANBAN TRANSITION)
# =====================================================================
@router.patch("/tasks/{task_id}")
def update_recall_task_status(task_id: str, payload: TaskStatusUpdateRequest):
    """
    Updates a task's state (e.g., when a user schedules or completes a repair) [cite: 37].
    """
    from supabase import create_client, Client
    sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)
    
    update_data = {"status": payload.status} # 'pending', 'scheduled', or 'repaired' [cite: 37]
    
    if payload.status == "scheduled":
        update_data["scheduled_repair_date"] = payload.scheduled_repair_date
    elif payload.status == "repaired":
        from datetime import datetime
        update_data["repaired_at"] = datetime.utcnow().isoformat()

    try:
        res = sb.table("recall_tasks").update(update_data).eq("id", task_id).execute() [cite: 50]
        if not res.data:
            raise HTTPException(status_code=404, detail="Task card not found.")
        return {"status": "success", "task": res.data}
    except Exception as e:
        logger.error(f"Failed updating task status: {str(e)}")
        raise HTTPException(status_code=500, detail="Database write operation failed.")
