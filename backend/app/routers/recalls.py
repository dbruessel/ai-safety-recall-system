# backend/app/routers/recalls.py
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Header, Response
from pydantic import BaseModel
from google.cloud import firestore

# Initialize the router namespace
router = APIRouter(
    prefix="/api",
    tags=["recalls"]
)

# Initialize Firestore Client
db = firestore.Client()

# Aligned collection production target
TRUE_NORMALIZED_COLLECTION = "recalls_normalized"

# --- DATA SCHEMA SCHEMES ---

class RecallResponse(BaseModel):
    campaign_number: str
    make: str
    model: str
    year: str
    component: str
    summary: Optional[str] = ""
    consequence: Optional[str] = ""
    remedy: Optional[str] = ""
    notes: Optional[str] = ""
    assembly_category: str          
    thermal_multiplier_active: bool  
    calculated_severity_score: int  
    executive_action_directive: str 

class BadgeVerificationResponse(BaseModel):
    make: str
    model: str
    year: str
    safety_status: str  # PASS / FAIL
    total_active_threats: int
    metered_pulse_recorded: bool
    aggregate_fleet_hazard_index: int  # Dynamic composite health baseline score

# --- ROUTER ENDPOINTS ---

@router.get("/recalls", response_model=List[RecallResponse])
async def get_vehicle_recalls(
    response: Response,
    make: str = Query(..., description="Vehicle Make (e.g., FORD)"),
    model: str = Query(..., description="Vehicle Model (e.g., F-150)"),
    year: str = Query(..., description="Vehicle Model Year (e.g., 2018)")
):
    """
    Query the pre-calculated production layer and return materialized data instantly.
    Injects optimal HTTP Client-facing caching headers to reduce database lookup overhead bills.
    """
    try:
        target_make = make.strip().upper()
        target_model = model.strip().upper()
        target_year = year.strip()

        # Inject REFACTOR #3: Client-Facing Caching Header (24-Hour Cache Window)
        # Instructs browsers, CDNs, and API gateways to store this identical payload lookup safely
        response.headers["Cache-Control"] = "public, max-age=86400"

        query_ref = (
            db.collection(TRUE_NORMALIZED_COLLECTION)
            .where(filter=firestore.FieldFilter("make", "==", target_make))
            .where(filter=firestore.FieldFilter("model", "==", target_model))
            .where(filter=firestore.FieldFilter("year", "==", target_year))
        )

        docs = list(query_ref.stream())
        
        # REFACTOR #1 REACTION: If no document exists in the normalized collection, 
        # it is a confirmed clean vehicle with 0 threats. Return a clean empty array instantly.
        if not docs:
            return []

        # Pull down the first matching document and read pre-calculated campaign telemetry arrays
        doc_data = docs[0].to_dict() or {}
        materialized_campaigns = doc_data.get("campaigns", [])
        
        flat_results = []
        for camp in materialized_campaigns:
            flat_results.append({
                "campaign_number": camp.get("campaign_number", "UNKNOWN"),
                "make": target_make,
                "model": target_model,
                "year": target_year,
                "component": camp.get("component", "UNKNOWN"),
                "summary": camp.get("summary", ""),
                "consequence": camp.get("consequence", ""),
                "remedy": camp.get("remedy", ""),
                "notes": camp.get("notes", ""),
                "assembly_category": camp.get("assembly_category", "STRUCTURAL CHASSIS MOUNT"),
                "thermal_multiplier_active": camp.get("thermal_multiplier_active", False),
                "calculated_severity_score": camp.get("calculated_severity_score", 40),
                "executive_action_directive": camp.get("executive_action_directive", "")
            })

        return flat_results

    except Exception as e:
        print(f"❌ Core Search Layer Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Error executing database match layer.")


@router.get("/recalls/badge-verification", response_model=BadgeVerificationResponse)
async def verify_vehicle_badge(
    response: Response,
    make: str = Query(..., description="Vehicle Make"),
    model: str = Query(..., description="Vehicle Model"),
    year: str = Query(..., description="Vehicle Year"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key", description="Developer Access Metering Token")
):
    """
    High-speed programmatic verification engine endpoint.
    Leverages pre-calculated, materialized scoring flags directly to instantly evaluate aggregate indexes.
    """
    try:
        # Inject REFACTOR #3: Cache verification checks for 12 hours
        response.headers["Cache-Control"] = "public, max-age=43200"

        target_make = make.strip().upper()
        target_model = model.strip().upper()
        target_year = year.strip()

        query_ref = (
            db.collection(TRUE_NORMALIZED_COLLECTION)
            .where(filter=firestore.FieldFilter("make", "==", target_make))
            .where(filter=firestore.FieldFilter("model", "==", target_model))
            .where(filter=firestore.FieldFilter("year", "==", target_year))
        )
        
        docs = list(query_ref.stream())
        
        # Clean Asset Optimization Fallback
        if not docs:
            return {
                "make": target_make,
                "model": target_model,
                "year": target_year,
                "safety_status": "PASS",
                "total_active_threats": 0,
                "metered_pulse_recorded": True,
                "aggregate_fleet_hazard_index": 100
            }
        
        doc_data = docs[0].to_dict() or {}
        materialized_campaigns = doc_data.get("campaigns", [])
        threat_count = len(materialized_campaigns)
        
        # Sum deductions cleanly over pre-materialized score keys
        running_score_deductions = 0
        for camp in materialized_campaigns:
            score = camp.get("calculated_severity_score", 40)
            running_score_deductions += int(score * 0.35)
            
        fleet_hazard_index = max(0, 100 - running_score_deductions)
        status = "FAIL" if threat_count > 0 or fleet_hazard_index < 85 else "PASS"

        print(f"⚡ [METERED PULSE] - {target_year} {target_make} {target_model} -> Safety Score: {fleet_hazard_index}%")

        return {
            "make": target_make,
            "model": target_model,
            "year": target_year,
            "safety_status": status,
            "total_active_threats": threat_count,
            "metered_pulse_recorded": True,
            "aggregate_fleet_hazard_index": fleet_hazard_index
        }

    except Exception as e:
        print(f"❌ Badge Verification API Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Error inside high-speed verification engine processing pipelines.")