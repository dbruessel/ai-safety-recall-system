import json
import os
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from pydantic import BaseModel, Field

from adapters.samsara_adapter import SamsaraAdapter, SamsaraAPIError

# Wire these to your existing db / VIN ingestion helpers in app/ingestion or verifier.py
# from db import get_db_connection
# from app.ingestion.vin_ingestor import upsert_fleet_vins

router = APIRouter(prefix="/api/integrations/samsara", tags=["Samsara Integration"])


class SamsaraConnectRequest(BaseModel):
    api_token: str = Field(..., min_length=10, description="Samsara API Token")
    webhook_secret: Optional[str] = Field(
        None, description="Base64 webhook signing secret from Samsara dashboard"
    )
    auto_sync_enabled: bool = True


class SamsaraSyncResponse(BaseModel):
    status: str
    synced_vehicles: int
    skipped_no_vin: int = 0
    message: str


@router.post("/connect")
async def connect_samsara(payload: SamsaraConnectRequest):
    """Validates Samsara token scopes and persists org credentials."""
    adapter = SamsaraAdapter(api_token=payload.api_token)
    try:
        check = await adapter.verify_connection()
    except SamsaraAPIError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to authenticate with Samsara: {exc}",
        )

    # TODO: Save encrypted payload.api_token & payload.webhook_secret for the active org in db.py
    return {
        "connected": True,
        "provider": "samsara",
        "sample_vehicles_detected": check["sample_count"],
    }


@router.post("/sync", response_model=SamsaraSyncResponse)
async def trigger_samsara_sync(
    background_tasks: BackgroundTasks,
    x_samsara_token: Optional[str] = Header(None),
):
    """Pulls all vehicles with 17-char VINs from Samsara and triggers NHTSA/OEM recall scan."""
    token = x_samsara_token or os.getenv("SAMSARA_API_TOKEN")
    if not token:
        raise HTTPException(
            status_code=400,
            detail="Missing Samsara API token. Connect Samsara first.",
        )

    adapter = SamsaraAdapter(api_token=token)
    try:
        vehicles = await adapter.fetch_all_vehicles()
    except SamsaraAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    # TODO: Replace with your existing VIN upsert + NHTSA recall check pipeline:
    # background_tasks.add_task(upsert_fleet_vins, org_id=current_org.id, vehicles=vehicles, source="samsara")

    return SamsaraSyncResponse(
        status="success",
        synced_vehicles=len(vehicles),
        message=f"Synced {len(vehicles)} Samsara vehicles into RecallLogic.",
    )


@router.post("/webhook")
async def samsara_webhook_receiver(
    request: Request,
    background_tasks: BackgroundTasks,
    x_samsara_timestamp: str = Header("", alias="X-Samsara-Timestamp"),
    x_samsara_signature: str = Header("", alias="X-Samsara-Signature"),
    x_samsara_event_type: str = Header("", alias="X-Samsara-Event-Type"),
):
    """
    Receives real-time Samsara Webhooks 2.0 events (DvirSubmitted, EngineFaultOn, VehicleCreated).
    Returns 200 immediately so Samsara does not retry (10s timeout limit).
    """
    raw_body = await request.body()
    secret = os.getenv("SAMSARA_WEBHOOK_SECRET", "")

    if secret and not SamsaraAdapter.verify_webhook_signature(
        raw_body=raw_body,
        timestamp_header=x_samsara_timestamp,
        signature_header=x_samsara_signature,
        base64_secret=secret,
    ):
        raise HTTPException(status_code=401, detail="Invalid Samsara webhook signature")

    event = json.loads(raw_body.decode("utf-8"))
    event_type = event.get("eventType") or x_samsara_event_type

    if event_type in {"DvirSubmitted", "EngineFaultOn", "VehicleCreated"}:
        # Enqueue async cross-check against open NHTSA recalls for the affected vehicle
        background_tasks.add_task(_process_samsara_event, event_type, event)

    return {"received": True, "eventType": event_type}


async def _process_samsara_event(event_type: str, event: dict) -> None:
    """Async background processor for DVIR defects and active DTC fault codes."""
    data = event.get("data") or {}
    vehicle = data.get("vehicle") or {}
    vin = vehicle.get("vin")
    # TODO: Cross-reference `vin` + `data.get("defects")` against active recalls in your DB
    _ = (event_type, vin)