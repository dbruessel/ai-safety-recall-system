# Add this import at the top
from fastapi import Header

@router.post("/reset")
async def reset_replica_state(
    sb: Client = Depends(get_sandbox_supabase),
    x_sandbox_key: str = Header(...) # A shared secret for local dev environments
):
    # Security layer: Require an X-Sandbox-Key header
    if x_sandbox_key != "RECALL_LOGIC_LOCAL_ONLY_SECRET":
        raise HTTPException(status_code=403, detail="Unauthorized: Access Denied")
    
    # ... rest of your reset logic ...

import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from supabase import Client
from app.config import get_settings

# Configure logging for audit trails - CRITICAL for PM interview discussions
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sandbox-controller")

router = APIRouter()

# Schema for the Agent's "Task Matrix" input
class TaskMatrix(BaseModel):
    workflow_id: str
    target_state: Dict[str, Any]
    steps: list[str]

def get_sb_client():
    settings = get_settings()
    if settings.environment != "sandbox":
        raise HTTPException(status_code=403, detail="Forbidden: Production Environment")
    return Client(settings.supabase_url, settings.supabase_service_key)

@router.post("/reset")
async def reset_replica_state(sb: Client = Depends(get_sb_client)):
    """
    Ensures 'State Stability'. Clears testing tables and reseeds 
    with a deterministic dataset matrix.
    """
    logger.info("Initializing Sandbox Replica Reset...")
    try:
        # 1. Clean Slate (Atomic cleanup)
        sb.table("recalls_normalized").delete().neq("id", "none").execute()
        sb.table("fleets").delete().neq("id", "none").execute()

        # 2. Seed Data (Deterministic Test Vectors)
        # This demonstrates "Data Minimization" - only what is needed for the test
        sb.table("fleets").insert([
            {"id": "test-fleet-alpha", "name": "Freemium Fleet", "vin_count": 5},
            {"id": "test-fleet-beta", "name": "Premium Fleet", "vin_count": 15}
        ]).execute()

        return {"status": "success", "message": "Replica environment state reset."}
    except Exception as e:
        logger.error(f"Reset failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute-matrix")
async def execute_task_matrix(matrix: TaskMatrix):
    """
    Enables 'Multiple-Task' testing by accepting a workflow definition
    from the Agent.
    """
    logger.info(f"Executing Workflow: {matrix.workflow_id}")
    # Logic to parse steps and trigger backend services would go here
    return {"status": "accepted", "workflow": matrix.workflow_id}