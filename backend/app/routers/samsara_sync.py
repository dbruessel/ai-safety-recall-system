import json
import logging
import os
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field

from app.services.samsara_service import SamsaraService
from app.routers.fleetio_sync import check_vin_recalls, get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/integrations/samsara", tags=["Samsara Integration"])


# =====================================================================
# SINGLE VEHICLE AUDIT & PERSISTENCE HELPER
# =====================================================================
def audit_and_persist_samsara_vehicle(
    vehicle_dict: Dict[str, Any],
    api_token: Optional[str] = None,
    organization_id: Optional[str] = None,
    profile_id: Optional[str] = None,
    dvir_defect_note: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Audits an individual vehicle from Samsara against NHTSA, upserts
    the compliance & punitive exposure record into Supabase, and executes
    closed-loop outbound tagging in Samsara Cloud.
    """
    vin = vehicle_dict.get("vin")
    if not vin:
        logger.warning("Samsara vehicle missing VIN; skipping audit.")
        return None

    vin = vin.strip().upper()
    samsara_veh_id = str(vehicle_dict.get("samsara_id") or vehicle_dict.get("id", ""))
    resolved_token = api_token or os.getenv("SAMSARA_API_TOKEN")
    supabase = get_supabase_client()

    # 1. Query NHTSA safety defects (reusing Fleetio router's verified helper)
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
    defect_summary = (
        f"{campaign_number} — {component_display}"
        if has_defect
        else "No Open NHTSA Defect Campaigns"
    )

    # 2. Closed-loop outbound Samsara tag sync (tag on critical defect, untag when cleared)
    outbound_result: Dict[str, Any] = {"status": "skipped"}
    if resolved_token and samsara_veh_id:
        samsara = SamsaraService(api_token=resolved_token)
        outbound_result = samsara.sync_vehicle_recall_tag(
            samsara_vehicle_id=samsara_veh_id,
            has_critical_recall=(has_defect and is_critical),
        )

    # 3. Resolve Liability and Compliance Status
    if not has_defect:
        compliance_status = "CLEARED"
        punitive_exposure = 0
        remedy_logistics = "NHTSA Safety Certified Defect-Free"
    else:
        compliance_status = "OPEN"
        punitive_exposure = 250000 if is_critical else 0
        if dvir_defect_note:
            remedy_logistics = f"Samsara DVIR Flagged: {dvir_defect_note}"
        elif outbound_result.get("status") == "success":
            remedy_logistics = "Samsara Vehicle Tagged [Critical Safety Recall] — Remediation Required"
        else:
            remedy_logistics = "Samsara Telematics Monitored — Remediation Required"

    # 4. Persist record in Supabase
    unit_name = vehicle_dict.get("name") or vehicle_dict.get("unit_number") or f"UNIT-{vin[-4:]}"
    make_name = vehicle_dict.get("make") or "COMMERCIAL"
    model_name = vehicle_dict.get("model") or "POWER UNIT"
    year_val = vehicle_dict.get("year") or 2023
    meter_reading = vehicle_dict.get("meter_reading")

    vehicle_data: Dict[str, Any] = {
        "vin": vin,
        "unit_number": unit_name,
        "make": str(make_name).upper(),
        "model": str(model_name).upper(),
        "year": int(year_val) if str(year_val).isdigit() else 2023,
        "samsara_vehicle_id": samsara_veh_id,
        "samsara_meter_reading": meter_reading,
        "telematics_provider": "samsara",
        "campaign_id": campaign_number,
        "safety_recall_details": defect_summary,
        "compliance_status": compliance_status,
        "punitive_exposure": punitive_exposure,
        "remedy_logistics": remedy_logistics,
        "organization_id": organization_id,
        "profile_id": profile_id,
    }

    vehicle_res = (
        supabase.table("monitored_vehicles")
        .upsert(vehicle_data, on_conflict="vin")
        .execute()
    )

    if vehicle_res.data and has_defect:
        saved_vehicle_id = vehicle_res.data[0]["id"]
        task_data = {
            "vehicle_id": saved_vehicle_id,
            "campaign_number": campaign_number,
            "component": primary_recall.get("component"),
            "summary": primary_recall.get("summary"),
            "remedy": primary_recall.get("remedy"),
            "severity_score": 9.5 if is_critical else 6.0,
            "nuclear_liability_flag": is_critical,
            "status": "open",
        }
        supabase.table("recall_tasks").upsert(
            task_data, on_conflict="vehicle_id,campaign_number"
        ).execute()

    logger.info(
        f"Audited Samsara VIN {vin}: Status={compliance_status}, Exposure=${punitive_exposure:,}, Outbound={outbound_result.get('status')}"
    )
    return vehicle_data


# =====================================================================
# BACKGROUND BATCH SYNC TASK
# =====================================================================
def run_samsara_sync_task(
    api_token: Optional[str] = None,
    organization_id: Optional[str] = None,
    profile_id: Optional[str] = None,
):
    try:
        resolved_token = api_token or os.getenv("SAMSARA_API_TOKEN")
        samsara = SamsaraService(api_token=resolved_token)
        vehicles = samsara.fetch_active_vehicles(include_odometer=True)

        synced_count = 0
        for v in vehicles:
            if v.get("vin"):
                audit_and_persist_samsara_vehicle(
                    vehicle_dict=v,
                    api_token=resolved_token,
                    organization_id=organization_id,
                    profile_id=profile_id,
                )
                synced_count += 1

        logger.info(f"Samsara batch sync finished: {synced_count} vehicles audited.")
    except Exception as e:
        logger.error(f"Error during Samsara background sync: {str(e)}", exc_info=True)


# =====================================================================
# REQUEST BODY MODELS
# =====================================================================
class SamsaraSyncRequest(BaseModel):
    api_token: Optional[str] = Field(None, description="Samsara API Token (defaults to env)")
    organization_id: Optional[str] = Field(None, description="Supabase Organization ID")
    profile_id: Optional[str] = Field(None, description="Supabase Profile ID")


class SamsaraOutboundAlertRequest(BaseModel):
    api_token: Optional[str] = Field(None, description="Samsara API Token (defaults to env)")
    samsara_vehicle_id: Optional[str] = Field(
        None, description="Specific Samsara Vehicle ID to tag/untag (omit to sync all monitored Samsara vehicles)"
    )
    vin: Optional[str] = Field(None, description="Optional VIN lookup if samsara_vehicle_id is omitted")
    force_clear: bool = Field(
        False, description="Set true to remove the RecallLogic critical alert tag from the Samsara vehicle"
    )


# =====================================================================
# FASTAPI ENDPOINTS
# =====================================================================
@router.post("/sync")
async def sync_samsara_fleet(
    payload: SamsaraSyncRequest,
    background_tasks: BackgroundTasks,
):
    """
    Manual/Cron API trigger to run a full fleet sync against Samsara and NHTSA.
    """
    resolved_token = payload.api_token or os.getenv("SAMSARA_API_TOKEN")
    if not resolved_token:
        raise HTTPException(
            status_code=400,
            detail="Missing Samsara credentials. Provide api_token in request or configure SAMSARA_API_TOKEN.",
        )

    try:
        samsara = SamsaraService(api_token=resolved_token)
        _ = samsara.fetch_active_vehicles(include_odometer=False)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Samsara API connection or authentication failed: {str(e)}",
        )

    background_tasks.add_task(
        run_samsara_sync_task,
        api_token=resolved_token,
        organization_id=payload.organization_id,
        profile_id=payload.profile_id,
    )

    return {
        "status": "processing",
        "message": "Samsara sync running in background. Vehicles and telemetry are updating.",
    }


@router.post("/push-alerts")
async def push_samsara_outbound_alerts(payload: SamsaraOutboundAlertRequest):
    """
    Closed-loop outbound dispatch: Pushes or clears 'RecallLogic: Critical Safety Recall'
    vehicle tags in Samsara Cloud for monitored fleet vehicles with open critical defects.
    """
    resolved_token = payload.api_token or os.getenv("SAMSARA_API_TOKEN")
    if not resolved_token:
        raise HTTPException(
            status_code=400,
            detail="Missing Samsara credentials. Provide api_token or configure SAMSARA_API_TOKEN.",
        )

    samsara = SamsaraService(api_token=resolved_token)
    supabase = get_supabase_client()

    # Single-vehicle direct push/clear
    if payload.samsara_vehicle_id:
        res = samsara.sync_vehicle_recall_tag(
            samsara_vehicle_id=payload.samsara_vehicle_id,
            has_critical_recall=not payload.force_clear,
        )
        return {"status": "completed", "results": [res]}

    # Query Supabase monitored Samsara vehicles (filtered by VIN if supplied)
    query = supabase.table("monitored_vehicles").select(
        "vin, samsara_vehicle_id, compliance_status, punitive_exposure"
    )
    if payload.vin:
        query = query.eq("vin", payload.vin.strip().upper())
    else:
        query = query.eq("telematics_provider", "samsara")

    rows = query.execute().data or []
    results: List[Dict[str, Any]] = []

    for row in rows:
        veh_id = row.get("samsara_vehicle_id")
        if not veh_id:
            continue
        is_open_critical = (
            not payload.force_clear
            and row.get("compliance_status") == "OPEN"
            and (row.get("punitive_exposure") or 0) > 0
        )
        tag_res = samsara.sync_vehicle_recall_tag(
            samsara_vehicle_id=str(veh_id),
            has_critical_recall=is_open_critical,
        )
        tag_res["vin"] = row.get("vin")
        results.append(tag_res)

    return {
        "status": "completed",
        "processed_count": len(results),
        "results": results,
    }


@router.post("/webhook")
async def samsara_webhook_listener(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Samsara Webhooks 2.0 Listener (returns 200 immediately within Samsara's 10s timeout):
    1. VehicleCreated / VehicleUpdated -> Triggers instant NHTSA recall audit + outbound tag sync.
    2. DvirSubmitted -> Cross-checks driver-reported defects against open NHTSA recalls.
    """
    try:
        raw_body = await request.body()
        secret = os.getenv("SAMSARA_WEBHOOK_SECRET", "")

        if secret:
            ts_header = request.headers.get("X-Samsara-Timestamp", "")
            sig_header = request.headers.get("X-Samsara-Signature", "")
            if not SamsaraService.verify_webhook_signature(
                raw_body=raw_body,
                timestamp_header=ts_header,
                signature_header=sig_header,
                base64_secret=secret,
            ):
                raise HTTPException(status_code=401, detail="Invalid Samsara webhook signature")

        payload = json.loads(raw_body.decode("utf-8"))
        event_type = str(payload.get("eventType") or request.headers.get("X-Samsara-Event-Type") or "")
        data = payload.get("data") or {}
        vehicle_obj = data.get("vehicle") or data

        # 1. Vehicle lifecycle events
        if event_type in {"VehicleCreated", "VehicleUpdated"}:
            vin = vehicle_obj.get("vin")
            if vin:
                background_tasks.add_task(audit_and_persist_samsara_vehicle, vehicle_obj)
                return {"received": True, "action": "vehicle_audit_queued"}

        # 2. DVIR Submitted events (driver pre/post-trip inspection)
        if event_type == "DvirSubmitted":
            defects = data.get("defects") or []
            veh_id = str(vehicle_obj.get("id", ""))
            vin = vehicle_obj.get("vin")

            if not vin and veh_id:
                samsara = SamsaraService()
                fetched = samsara.fetch_vehicle_by_id(veh_id)
                if fetched:
                    vehicle_obj = fetched
                    vin = fetched.get("vin")

            if vin:
                defect_summary = (
                    ", ".join(d.get("comment") or d.get("defectType") or "DVIR Defect" for d in defects)
                    if defects
                    else "DVIR Inspection Logged"
                )
                background_tasks.add_task(
                    audit_and_persist_samsara_vehicle,
                    vehicle_obj,
                    None,
                    None,
                    None,
                    defect_summary,
                )
                return {"received": True, "action": "dvir_recall_audit_queued"}

        return {"received": True, "action": "ignored"}
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error handling Samsara webhook: {err}", exc_info=True)
        return {"received": True}