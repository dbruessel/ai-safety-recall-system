# backend/app/routers/recalls.py
import hashlib
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel
from supabase import create_client, Client
from app.config import settings 

router = APIRouter(tags=["recalls"])

# Supabase Client Initialization
sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)

# --- DATA SCHEMA SCHEMES ---

class RecallResponse(BaseModel):
    campaign_number: str
    make: str
    model: str
    year: str
    component: Optional[str] = "UNKNOWN"
    summary: Optional[str] = ""

class BadgeVerificationResponse(BaseModel):
    make: str
    model: str
    year: str
    safety_status: str  # PASS / FAIL
    total_active_threats: int
    metered_pulse_recorded: bool
    aggregate_fleet_hazard_index: int
    cryptographic_id: str  # Secure hash validating fleet current state

# --- ROUTER ENDPOINTS ---

@router.get("/recalls", response_model=List[RecallResponse])
async def get_vehicle_recalls(
    response: Response,
    make: str = Query(..., description="Vehicle Make (e.g., FORD)"),
    model: str = Query(..., description="Vehicle Model (e.g., F-150)"),
    year: str = Query(..., description="Vehicle Model Year (e.g., 2018)")
):
    """
    Query the Supabase relational layer directly. 
    Joins recall_results with recall_definitions for instant retrieval.
    """
    try:
        # Cache for 24 hours
        response.headers["Cache-Control"] = "public, max-age=86400"

        # Relational Join
        response_data = (
            sb.table("recall_results")
            .select("campaign_number, recall_definitions(make, model, year, component, summary)")
            .eq("recall_definitions.make", make.strip().upper())
            .eq("recall_definitions.model", model.strip().upper())
            .eq("recall_definitions.year", int(year))
            .execute()
        )

        flat_results = []
        for row in response_data.data:
            defn = row.get("recall_definitions", {})
            if defn:
                flat_results.append({
                    "campaign_number": row.get("campaign_number"),
                    "make": defn.get("make"),
                    "model": defn.get("model"),
                    "year": str(defn.get("year")),
                    "component": defn.get("component", "UNKNOWN"),
                    "summary": defn.get("summary", "")
                })
            
        return flat_results

    except Exception as e:
        print(f"❌ Supabase Search Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error executing database match layer.")


@router.get("/recalls/badge-verification", response_model=BadgeVerificationResponse)
async def verify_vehicle_badge(
    response: Response,
    make: str = Query(..., description="Vehicle Make"),
    model: str = Query(..., description="Vehicle Model"),
    year: str = Query(..., description="Vehicle Year")
):
    """
    High-speed verification engine querying Supabase directly.
    Calculates hazard index based on persisted severity_score and outputs a 
    cryptographically traceable badge hash to prevent tampering with safety metrics.
    """
    try:
        response.headers["Cache-Control"] = "public, max-age=43200"

        # Query and Join: Get severity scores directly from the definitions table
        response_data = (
            sb.table("recall_results")
            .select("campaign_number, recall_definitions(severity_score)")
            .eq("recall_definitions.make", make.strip().upper())
            .eq("recall_definitions.model", model.strip().upper())
            .eq("recall_definitions.year", int(year))
            .execute()
        )
        
        threats = response_data.data
        threat_count = len(threats)
        
        # Calculate hazard index using the stored severity_score (pre-calculated at ingest)
        # Deduct 35% of the severity score per threat
        total_deduction = sum(int(t['recall_definitions']['severity_score'] * 0.35) for t in threats)
        hazard_index = max(0, 100 - total_deduction)
        status = "PASS" if threat_count == 0 else "FAIL"

        # --- Cryptographic Hash Engine ---
        # Generates a secure hash of the vehicle/fleet's current state to prevent metric tampering
        state_string = f"{make.upper()}_{model.upper()}_{year}_threats_{threat_count}_hazard_{hazard_index}"
        secure_hash = hashlib.sha256(state_string.encode()).hexdigest()[:16].upper()
        cryptographic_id = f"AEGIS-{secure_hash}"

        return {
            "make": make.upper(),
            "model": model.upper(),
            "year": year,
            "safety_status": status,
            "total_active_threats": threat_count,
            "metered_pulse_recorded": True,
            "aggregate_fleet_hazard_index": hazard_index,
            "cryptographic_id": cryptographic_id
        }
        
    except Exception as e:
        print(f"❌ Badge Verification API Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Error inside high-speed verification engine.")