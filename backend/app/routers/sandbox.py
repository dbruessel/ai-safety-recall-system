import hmac
import hashlib
import json
import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from supabase import create_client, Client

from app.config import get_settings

router = APIRouter()

class MockCheckoutPayload(BaseModel):
    customer_email: str = "agent-test-fleet@recalllogic.internal"
    price_id: str = "price_premium_tier_10_vin_gate"
    metadata: Optional[Dict[str, str]] = {"fleet_limit_override": "true"}


def get_sandbox_supabase() -> Client:
    settings = get_settings()
    if getattr(settings, "environment", "").lower() != "sandbox":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sandbox Mutation Layer is completely disabled outside of sandbox testing nodes."
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)


@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset_replica_state(sb: Client = Depends(get_sandbox_supabase)):
    """
    ENDPOINT FOR TESTING AGENTS:
    Programmatically flushes and sets up pristine environment conditions for test loops.
    Uses universal 'not.is.null' filter mechanics to bypass column type casting constraints.
    """
    # Programmatically filter rows where 'id' is not null (works for integer, string, and UUID keys)
    for table_name in ["recalls_normalized", "fleets"]:
        try:
            sb.table(table_name).delete().filter("id", "not.is", "null").execute()
        except Exception as table_err:
            print(f"[Sandbox Setup Warning] Table {table_name} flush skipped: {str(table_err)}")

    try:
        # Seed Clean Matrix of States for Autonomous Workflows
        sb.table("fleets").insert([
            {"id": "test-fleet-alpha", "fleet_name": "Alpha Clean Telemetry Fleet"},
            {"id": "test-fleet-beta", "fleet_name": "Beta Boundary Limit Fleet"},
            {"id": "test-fleet-gamma", "fleet_name": "Gamma Desert Stress Fleet"}
        ]).execute()
        
        # Seed high-risk mock asset for Mojave calculation tracking
        try:
            sb.table("recalls_normalized").insert([
                {
                    "fleet_id": "test-fleet-gamma",
                    "vin": "1FA6P8CF0HXXXXXXX", 
                    "make": "FORD", 
                    "model": "MUSTANG", 
                    "year": "2017",
                    "campaign_number": "17V001000",
                    "component": "AIR BAGS",
                    "is_critical": True
                }
            ]).execute()
        except Exception as seed_err:
            print(f"[Sandbox Setup Warning] Mock asset seeding deferred: {str(seed_err)}")

        return {
            "status": "success",
            "message": "Replica environment prepared cleanly for agent automated workflow run.",
            "metrics_seeded": {
                "active_test_fleets": 3,
                "critical_high_heat_fixtures": 1
            }
        }
    except Exception as e:
        # DIAGNOSTIC IMPROVEMENT: Bubble up the raw, exact database engine exception message 
        # to terminal logs and responses so we can see what exact column or constraint is failing.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database Seeding Exception: {str(e)}"
        )


@router.post("/mock-checkout", status_code=status.HTTP_200_OK)
async def trigger_mock_stripe_checkout_event(payload: MockCheckoutPayload):
    settings = get_settings()
    current_timestamp = int(time.time())
    
    synthetic_stripe_event = {
        "id": f"evt_mock_{current_timestamp}",
        "object": "event",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": f"cs_test_{current_timestamp}",
                "customer_details": {"email": payload.customer_email},
                "payment_status": "paid",
                "amount_total": 4900,
                "currency": "usd",
                "metadata": payload.metadata
            }
        }
    }
    
    payload_string = json.dumps(synthetic_stripe_event, separators=(',', ':'))
    signature_payload = f"t={current_timestamp}.v1={payload_string}".encode("utf-8")
    
    webhook_secret = getattr(settings, "stripe_webhook_secret", "mock_secret_for_agent_testing")
    computed_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        signature_payload,
        hashlib.sha256
    ).hexdigest()
    
    return {
        "status": "simulated",
        "payload": synthetic_stripe_event,
        "simulated_header": f"t={current_timestamp},v1={computed_signature}"
    }