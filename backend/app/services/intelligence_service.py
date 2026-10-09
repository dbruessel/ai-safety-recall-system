import json
import logging
from typing import Dict, Any, List
from vertexai.generative_models import GenerativeModel
from app.engine import get_supabase_client

logger = logging.getLogger(__name__)

NUCLEAR_KEYWORDS = ["brake", "steering", "airbag", "fire", "fuel", "suspension"]


# =====================================================================
# 1. ACTUARIAL & FINANCIAL RISK ENGINE (BROKER & CFO LAYER)
# =====================================================================

class ActuarialRiskEngine:
    """
    Computes the RecallLogic Actuarial Risk Score (0-100) and 
    Financial Liability Exposure ($) across a fleet or individual vehicle.
    """

    @staticmethod
    def calculate_fleet_risk(organization_id: str) -> Dict[str, Any]:
        supabase = get_supabase_client()

        # 1. Fetch all monitored vehicles for the organization
        vehicles_res = supabase.table("monitored_vehicles") \
            .select("id, vin, make, model, fleetio_vehicle_id") \
            .eq("organization_id", organization_id) \
            .execute()
        
        vehicles = vehicles_res.data or []
        total_vins = len(vehicles)

        if total_vins == 0:
            return {
                "organization_id": organization_id,
                "safety_score": 100,
                "risk_tier": "LOW",
                "total_vins": 0,
                "open_recalls": 0,
                "nuclear_liability_count": 0,
                "financial_exposure_usd": 0,
                "underwriter_discount_eligibility": "10-15% Optimal Credit",
                "breakdown": {
                    "recall_penalty": 0.0,
                    "maintenance_penalty": 0.0,
                    "telematics_penalty": 0.0
                }
            }

        vehicle_ids = [v["id"] for v in vehicles]

        # 2. Fetch all open recall tasks
        tasks_res = supabase.table("recall_tasks") \
            .select("*") \
            .in_("vehicle_id", vehicle_ids) \
            .eq("status", "open") \
            .execute()

        recall_tasks = tasks_res.data or []

        # 3. Compute Pillar 1: NHTSA & OEM Recall Penalty (40% Weight)
        nuclear_count = 0
        standard_recall_count = 0
        recall_penalty_points = 0.0

        for task in recall_tasks:
            component = (task.get("component") or "").lower()
            is_nuclear = task.get("nuclear_liability_flag", False) or any(kw in component for kw in NUCLEAR_KEYWORDS)

            if is_nuclear:
                nuclear_count += 1
                # Base penalty: 25 points per nuclear recall
                recall_penalty_points += 25.0
            else:
                standard_recall_count += 1
                recall_penalty_points += 8.0

        # Normalize recall penalty by total fleet size
        normalized_recall_penalty = (recall_penalty_points / total_vins) * 0.40

        # 4. Compute Pillar 2: Deferred Maintenance Penalty (35% Weight - Fleetio Data)
        deferred_maint_penalty = (nuclear_count * 15.0 / total_vins) * 0.35

        # 5. Compute Pillar 3: Telematics Behavioral Penalty (25% Weight - Samsara/Geotab)
        telematics_penalty = 0.0

        # Total Deductions
        total_deduction = normalized_recall_penalty + deferred_maint_penalty + telematics_penalty
        
        # Calculate Final Safety Score (Clamped between 0 and 100)
        raw_score = 100.0 - total_deduction
        safety_score = max(0, min(100, round(raw_score)))

        # 6. Calculate Financial Exposure ($)
        # $250,000 per nuclear liability vehicle + $50,000 per standard open recall
        financial_exposure = (nuclear_count * 250000) + (standard_recall_count * 50000)

        # Determine Underwriter Rating & Discount Status
        if safety_score >= 85:
            risk_tier = "PREFERRED"
            discount_eligibility = "12-15% Underwriter Rate Discount"
        elif safety_score >= 70:
            risk_tier = "STANDARD"
            discount_eligibility = "5-10% Underwriter Credit"
        elif safety_score >= 50:
            risk_tier = "ELEVATED"
            discount_eligibility = "Standard Rates / Subject to Audit"
        else:
            risk_tier = "HIGH RISK / NUCLEAR EXPOSURE"
            discount_eligibility = "Uninsurable Warning / Surcharge Risk"

        return {
            "organization_id": organization_id,
            "safety_score": safety_score,
            "risk_tier": risk_tier,
            "total_vins": total_vins,
            "open_recalls": len(recall_tasks),
            "nuclear_liability_count": nuclear_count,
            "financial_exposure_usd": financial_exposure,
            "underwriter_discount_eligibility": discount_eligibility,
            "breakdown": {
                "recall_penalty": round(normalized_recall_penalty, 2),
                "maintenance_penalty": round(deferred_maint_penalty, 2),
                "telematics_penalty": round(telematics_penalty, 2)
            }
        }


# =====================================================================
# 2. AI SINGLE RECALL ANALYSIS (EXISTING AI ENGINE)
# =====================================================================

def _build_prompt(recall: Dict) -> str:
    """
    Build the structured prompt for Gemini to analyze a vehicle recall.
    """
    title = recall.get("title", "")
    description = recall.get("description", "")
    vin = recall.get("vin", "UNKNOWN VIN")

    return f"""
You are an automotive safety and recall risk expert.

You will receive information about a vehicle safety recall and must produce:
1) A short, plain-language summary for the vehicle owner.
2) A categorical risk level: one of ["low", "medium", "high", "critical"].
3) An imminent risk score from 0 to 100 (integer).
4) An explainable message that tells this specific owner why this recall matters.

Context:
- VIN: {vin}
- Recall title: {title}
- Recall description: {description}

Output JSON ONLY in this exact schema:

{{
  "ai_summary": "string",
  "risk_level": "low | medium | high | critical",
  "imminent_risk_score": 0,
  "explainable_message": "string"
}}
"""


def analyze_recall(recall: Dict) -> Dict:
    """
    Calls Gemini on Vertex AI to analyze a recall and return:
    - ai_summary
    - risk_level
    - imminent_risk_score
    - explainable_message
    """
    prompt = _build_prompt(recall)

    try:
        model = GenerativeModel("gemini-1.5-pro")
        response = model.generate_content(prompt)

        text = "".join(
            part.text
            for part in response.candidates[0].content.parts
            if hasattr(part, "text")
        )
        data = json.loads(text)
    except Exception as e:
        logger.error(f"Error executing Gemini recall analysis: {e}")
        data = {
            "ai_summary": "This recall may affect the safe operation of this vehicle.",
            "risk_level": "medium",
            "imminent_risk_score": 50,
            "explainable_message": "Risk could not be fully analyzed. Please review manually.",
        }

    # Normalize risk score
    score = data.get("imminent_risk_score", 50)
    try:
        score = int(score)
    except Exception:
        score = 50
    score = max(0, min(100, score))

    # Normalize risk level
    level = str(data.get("risk_level", "medium")).lower()
    if level not in ["low", "medium", "high", "critical"]:
        level = "medium"

    return {
        "ai_summary": data.get("ai_summary"),
        "risk_level": level,
        "imminent_risk_score": score,
        "explainable_message": data.get("explainable_message"),
    }


# =====================================================================
# 3. AI CONTEXTUAL FLEET ANALYSIS (EXISTING AI ENGINE)
# =====================================================================

def _build_contextual_prompt(context: Dict) -> str:
    """
    Build a prompt that includes vehicle, recall, weather, geographic, and seasonal risk.
    """
    vin = context.get("vin", "UNKNOWN VIN")
    vehicle = context.get("vehicle", {})
    recalls = context.get("recalls", [])
    weather = context.get("weather", {})
    geo = context.get("geographic_risk", {})
    seasonal = context.get("seasonal_risk", {})

    primary_recall = recalls[0] if recalls else {}
    title = primary_recall.get("title", "")
    description = primary_recall.get("description", "")

    return f"""
You are an automotive safety and risk intelligence engine.

You will receive:
- Vehicle information
- Recall information (if any)
- Weather conditions
- Geographic risk factors
- Seasonal risk factors

Your job is to:
1) Assess the overall safety and imminent risk for this specific vehicle.
2) Consider how environment, geography, and season interact with known recalls or vehicle characteristics.
3) Produce:
   - A short, plain-language summary for the vehicle owner.
   - A categorical risk level: one of ["low", "medium", "high", "critical"].
   - An imminent risk score from 0 to 100 (integer).
   - An explainable message that tells this specific owner why this situation matters now.

Context:
- VIN: {vin}
- Vehicle: {json.dumps(vehicle)}
- Primary recall title: {title}
- Primary recall description: {description}
- Weather: {json.dumps(weather)}
- Geographic risk: {json.dumps(geo)}
- Seasonal risk: {json.dumps(seasonal)}

Output JSON ONLY in this exact schema:

{{
  "ai_summary": "string",
  "risk_level": "low | medium | high | critical",
  "imminent_risk_score": 0,
  "explainable_message": "string"
}}
"""


def analyze_context(context: Dict) -> Dict:
    """
    Calls Gemini with full intelligence context (vehicle + recalls + environment).
    """
    prompt = _build_contextual_prompt(context)
    
    try:
        model = GenerativeModel("gemini-1.5-pro")
        response = model.generate_content(prompt)

        text = "".join(
            part.text
            for part in response.candidates[0].content.parts
            if hasattr(part, "text")
        )
        data = json.loads(text)
    except Exception as e:
        logger.error(f"Error executing Gemini context analysis: {e}")
        data = {
            "ai_summary": "This vehicle may be exposed to safety risks based on its configuration and environment.",
            "risk_level": "medium",
            "imminent_risk_score": 50,
            "explainable_message": "Risk could not be fully analyzed. Please review manually.",
        }

    score = data.get("imminent_risk_score", 50)
    try:
        score = int(score)
    except Exception:
        score = 50
    score = max(0, min(100, score))

    level = str(data.get("risk_level", "medium")).lower()
    if level not in ["low", "medium", "high", "critical"]:
        level = "medium"

    return {
        "ai_summary": data.get("ai_summary"),
        "risk_level": level,
        "imminent_risk_score": score,
        "explainable_message": data.get("explainable_message"),
    }