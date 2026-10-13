import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, status
from pydantic import BaseModel
from app.engine import get_supabase

logger = logging.getLogger("telematics-router")

router = APIRouter(prefix="/webhooks", tags=["telematics-webhooks"])


class GenericTelematicsPayload(BaseModel):
    vin: str
    provider: str  # 'samsara', 'geotab', 'fleetio'
    event_type: str  # 'harsh_braking', 'speeding', 'dtc_fault'
    severity: Optional[str] = "medium"
    dtc_code: Optional[str] = None
    organization_id: Optional[str] = None


@router.post("/samsara", status_code=status.HTTP_200_OK)
async def handle_samsara_webhook(request: Request):
    """
    Inbound webhook for Samsara Safety & Diagnostic Events (Harsh Braking, Speeding, Fault Codes).
    """
    supabase = get_supabase()
    try:
        data = await request.json()
        logger.info(f"Received Samsara Webhook Payload: {data}")

        # Samsara event extraction
        event_data = data.get("event", data)
        vin = event_data.get("vin") or event_data.get("vehicle", {}).get("vin")
        event_type = event_data.get("type", "harsh_braking").lower()
        severity = "high" if "harsh" in event_type or "fault" in event_type else "medium"

        if not vin:
            return {"status": "ignored", "reason": "No VIN provided in payload"}

        # Map VIN to monitored vehicle
        v_res = supabase.table("monitored_vehicles").select("id, organization_id").eq("vin", vin).execute()
        vehicle = v_res.data[0] if v_res.data else None

        telematics_entry = {
            "vin": vin,
            "provider": "samsara",
            "event_type": event_type,
            "severity": severity,
            "dtc_code": event_data.get("faultCode"),
            "raw_payload": data,
            "vehicle_id": vehicle["id"] if vehicle else None,
            "organization_id": vehicle["organization_id"] if vehicle else None
        }

        supabase.table("telematics_events").insert(telematics_entry).execute()
        return {"status": "success", "event_logged": event_type, "vin": vin}
    except Exception as e:
        logger.error(f"Error processing Samsara webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Samsara processing failed: {str(e)}")


@router.post("/geotab", status_code=status.HTTP_200_OK)
async def handle_geotab_webhook(request: Request):
    """
    Inbound webhook for Geotab Telemetry (Driver Behavior & Engine Faults).
    """
    supabase = get_supabase()
    try:
        data = await request.json()
        logger.info(f"Received Geotab Webhook Payload: {data}")

        vin = data.get("vin")
        rule_name = (data.get("rule", {}).get("name") or data.get("eventType") or "driver_behavior").lower()
        
        if "brake" in rule_name:
            event_type = "harsh_braking"
        elif "speed" in rule_name:
            event_type = "speeding"
        elif "fault" in rule_name or "code" in rule_name:
            event_type = "dtc_fault"
        else:
            event_type = "harsh_driving"

        if not vin:
            return {"status": "ignored", "reason": "No VIN found in Geotab payload"}

        v_res = supabase.table("monitored_vehicles").select("id, organization_id").eq("vin", vin).execute()
        vehicle = v_res.data[0] if v_res.data else None

        telematics_entry = {
            "vin": vin,
            "provider": "geotab",
            "event_type": event_type,
            "severity": "high" if event_type in ["dtc_fault", "harsh_braking"] else "medium",
            "dtc_code": data.get("diagnosticCode"),
            "raw_payload": data,
            "vehicle_id": vehicle["id"] if vehicle else None,
            "organization_id": vehicle["organization_id"] if vehicle else None
        }

        supabase.table("telematics_events").insert(telematics_entry).execute()
        return {"status": "success", "event_logged": event_type, "vin": vin}
    except Exception as e:
        logger.error(f"Error processing Geotab webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Geotab processing failed: {str(e)}")


@router.post("/test-event", status_code=status.HTTP_201_CREATED)
async def inject_test_telematics_event(payload: GenericTelematicsPayload):
    """
    Direct simulation route to inject test telematics events for broker demo mode.
    """
    supabase = get_supabase()
    try:
        v_res = supabase.table("monitored_vehicles").select("id, organization_id").eq("vin", payload.vin).execute()
        vehicle = v_res.data[0] if v_res.data else None

        telematics_entry = {
            "vin": payload.vin,
            "provider": payload.provider,
            "event_type": payload.event_type,
            "severity": payload.severity,
            "dtc_code": payload.dtc_code,
            "vehicle_id": vehicle["id"] if vehicle else None,
            "organization_id": payload.organization_id or (vehicle["organization_id"] if vehicle else None)
        }

        res = supabase.table("telematics_events").insert(telematics_entry).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        logger.error(f"Failed to inject test event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Injection failed: {str(e)}")