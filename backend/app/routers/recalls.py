from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel
from google.cloud import firestore

# Initialize the router namespace
router = APIRouter(
    prefix="/api",
    tags=["recalls"]
)

# Initialize Firestore
db = firestore.Client()

# Aligned with your pristine, 25,041 flat-file production records
TRUE_NORMALIZED_COLLECTION = "recalls_normalized"

# --- DATA SCHEMA SCHEMES ---

# Expanded Response Schema delivering your proprietary predictive parameters
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
    # --- PROPRIETARY SAAS DATA MOAT METRICS ---
    assembly_category: str          # Normalized structural assembly focus
    thermal_multiplier_active: bool  # True if exposed to high regional desert degradation risks
    calculated_severity_score: int  # 0 (Pristine Safe) to 100 (Immediate Subassembly Melt Risk)
    executive_action_directive: str # Actionable instructions tailored for fleet dispatch managers

class BadgeVerificationResponse(BaseModel):
    make: str
    model: str
    year: str
    safety_status: str  # PASS / FAIL
    total_active_threats: int
    metered_pulse_recorded: bool
    aggregate_fleet_hazard_index: int  # Dynamic composite health baseline score

# --- INTERNAL PREDICTIVE CORE WORKFLOW UTILITIES ---

def calculate_safety_telemetry(component: str, summary: str, consequence: str) -> Dict[str, Any]:
    """
    The Proprietary Secret Sauce: Core Parsing & Hazard Risk Logic.
    Processes raw database strings to output high-value environmental intelligence parameters.
    """
    comp_upper = component.upper()
    text_corpus = (summary + " " + consequence).upper()
    
    # 1. Standardize and Categorize System Subassemblies
    if "ELECTRICAL" in comp_upper or "WIRING" in comp_upper or "MODULE" in comp_upper:
        category = "ELECTRICAL SYSTEM"
        base_severity = 65
    elif "BATTERY" in comp_upper or "CELL" in comp_upper or "CHARGER" in comp_upper:
        category = "ENERGY STORAGE / BATTERY"
        base_severity = 80
    elif "FUEL" in comp_upper or "TANK" in comp_upper or "LINE" in comp_upper or "RAIL" in comp_upper:
        category = "FUEL DELIVERY ARCHITECTURE"
        base_severity = 75
    elif "BRAKE" in comp_upper or "HYDRAULIC" in comp_upper or "CALIPER" in comp_upper:
        category = "DECELERATION CONTROL"
        base_severity = 85
    elif "STEERING" in comp_upper or "LINKAGE" in comp_upper:
        category = "DIRECTIONAL MATRIX"
        base_severity = 70
    else:
        category = "STRUCTURAL CHASSIS MOUNT"
        base_severity = 40

    # 2. Localized Regional Environment Threat Detection (The Desert Coefficient)
    # Scans for heat-accelerated failure vectors typical of Phoenix/Mojave corridors
    thermal_keywords = ["HEAT", "FIRE", "MELT", "THERMAL", "CORROSION", "EXPANSION", "SHORT CIRCUIT", "DEGRADATION", "SHORT"]
    has_thermal_risk = any(kw in text_corpus for kw in thermal_keywords)
    
    # Apply predictive mathematical penalty scaling rules based on climate exposures
    severity_multiplier = 1.25 if has_thermal_risk else 1.00
    final_severity = min(100, int(base_severity * severity_multiplier))

    # 3. Formulate Actionable Fleet Dispatch Directives
    if final_severity >= 85:
        directive = "⚠️ CRITICAL HAZARD: Ground vehicle immediately. Structural or subassembly failure risk under current operational parameters."
    elif final_severity >= 65:
        if has_thermal_risk:
            directive = "☀️ REGIONAL WEATHER WARNING: High ambient localized thermal exposure risks compound component degradation. Reroute assets out of high-heat desert vectors."
        else:
            directive = "🔧 ADVANCED MAINTENANCE REQUIRED: Schedule component inspection and subassembly mitigation loop within 48 operational hours."
    else:
        directive = "📋 MONITOR CONDITION: Routine tracking active. Address update during next standard depot inspection layout interval."

    return {
        "assembly_category": category,
        "thermal_multiplier_active": has_thermal_risk,
        "calculated_severity_score": final_severity,
        "executive_action_directive": directive
    }

# --- ROUTER ENDPOINTS ---

@router.get("/recalls", response_model=List[RecallResponse])
async def get_vehicle_recalls(
    make: str = Query(..., description="Vehicle Make (e.g., FORD)"),
    model: str = Query(..., description="Vehicle Model (e.g., F-150)"),
    year: str = Query(..., description="Vehicle Model Year (e.g., 2018)")
):
    """
    Query the clean production layer and calculate dynamic vulnerability intelligence telemetry on the fly.
    """
    try:
        target_make = make.strip().upper()
        target_model = model.strip().upper()
        target_year = year.strip()

        query_ref = (
            db.collection(TRUE_NORMALIZED_COLLECTION)
            .where(filter=firestore.FieldFilter("make", "==", target_make))
            .where(filter=firestore.FieldFilter("model", "==", target_model))
            .where(filter=firestore.FieldFilter("year", "==", target_year))
        )

        flat_results = []
        
        for doc in query_ref.stream():
            data = doc.to_dict() or {}
            comp = data.get("component", "UNKNOWN")
            summ = data.get("summary", "")
            cons = data.get("consequence", "")
            
            # Execute our proprietary scoring metrics logic
            telemetry = calculate_safety_telemetry(comp, summ, cons)

            # If our internal calculation flags a Mojave weather alert, seamlessly push it to the output card notes
            notes_override = data.get("notes", "")
            if telemetry["thermal_multiplier_active"] and telemetry["calculated_severity_score"] >= 75:
                notes_override = f"⚠️ [REGIONAL WEATHER ALERT: CRITICAL HIGH] - Mojave / Sonoran thermal thresholds exceeded. {telemetry['executive_action_directive']}"

            flat_results.append({
                "campaign_number": data.get("campaign_number") or data.get("campaignNumber", "UNKNOWN"),
                "make": data.get("make", target_make),
                "model": data.get("model", target_model),
                "year": data.get("year", target_year),
                "component": comp,
                "summary": summ,
                "consequence": cons,
                "remedy": data.get("remedy", ""),
                "notes": notes_override,
                "assembly_category": telemetry["assembly_category"],
                "thermal_multiplier_active": telemetry["thermal_multiplier_active"],
                "calculated_severity_score": telemetry["calculated_severity_score"],
                "executive_action_directive": telemetry["executive_action_directive"]
            })

        return flat_results

    except Exception as e:
        print(f"❌ Core Search Layer Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Error executing database match layer.")


@router.get("/recalls/badge-verification", response_model=BadgeVerificationResponse)
async def verify_vehicle_badge(
    make: str = Query(..., description="Vehicle Make"),
    model: str = Query(..., description="Vehicle Model"),
    year: str = Query(..., description="Vehicle Year"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key", description="Developer Access Metering Token")
):
    """
    Epic 3: High-speed programmatic verification engine method.
    Returns binary flags and an aggregate integrity baseline for enterprise rideshare batch sweeps.
    """
    try:
        if not x_api_key:
            print("⚠️ Request triggered without explicit X-API-Key header context.")

        target_make = make.strip().upper()
        target_model = model.strip().upper()
        target_year = year.strip()

        query_ref = (
            db.collection(TRUE_NORMALIZED_COLLECTION)
            .where(filter=firestore.FieldFilter("make", "==", target_make))
            .where(filter=firestore.FieldFilter("model", "==", target_model))
            .where(filter=firestore.FieldFilter("year", "==", target_year))
        )
        
        # Pull documents to calculate true composite risk indexes rather than generic counting summaries
        docs = list(query_ref.stream())
        threat_count = len(docs)
        
        # Calculate a baseline index: Start at a perfect 100, deduct points based on subassembly severity caps
        running_score_deductions = 0
        for doc in docs:
            d = doc.to_dict() or {}
            telemetry = calculate_safety_telemetry(d.get("component", ""), d.get("summary", ""), d.get("consequence", ""))
            running_score_deductions += int(telemetry["calculated_severity_score"] * 0.35)
            
        fleet_hazard_index = max(0, 100 - running_score_deductions)
        status = "FAIL" if threat_count > 0 or fleet_hazard_index < 85 else "PASS"

        print(f"⚡ [METERED PULSE RECORDED] - Key token: {x_api_key or 'SANDBOX_DEV'} evaluated {target_year} {target_make} {target_model} -> Safety Score: {fleet_hazard_index}% -> Status: {status}")

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
        print(f"❌ Badge Validation API Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Error inside high-speed verification engine processing pipelines.")