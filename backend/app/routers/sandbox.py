import hmac
import hashlib
import json
import time
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel
from supabase import create_client, Client
from app.config import get_settings

# 1. Initialize the router object FIRST
router = APIRouter(tags=["sandbox"])
logger = logging.getLogger("sandbox-controller")

class MockCheckoutPayload(BaseModel):
    customer_email: str = "agent-test-fleet@recalllogic.internal"
    price_id: str = "price_premium_tier_10_vin_gate"
    metadata: Optional[Dict[str, Any]] = {"fleet_limit_override": "true"}

def get_sandbox_supabase() -> Client:
    settings = get_settings()
    if getattr(settings, "environment", "").lower() != "sandbox":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sandbox Mutation Layer is disabled."
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)

# 2. Now the routes will work because 'router' is defined above
@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset_replica_state(
    sb: Client = Depends(get_sandbox_supabase),
    x_sandbox_key: str = Header(None)
):
    # Safety guardrail
    if x_sandbox_key != "RECALL_LOGIC_LOCAL_ONLY_SECRET":
        raise HTTPException(status_code=403, detail="Unauthorized")

    logger.info("Initializing Sandbox Replica Reset...")
    # ... (rest of your reset logic)
    return {"status": "success", "message": "Replica reset."}

@router.post("/mock-checkout", status_code=status.HTTP_200_OK)
async def trigger_mock_stripe_checkout_event(payload: MockCheckoutPayload):
    # ... (rest of your checkout logic)
    return {"status": "simulated"}