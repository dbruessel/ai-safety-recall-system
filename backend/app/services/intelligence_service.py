from typing import Dict
import json
from vertexai.generative_models import GenerativeModel


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

    # Initialize Gemini model
    model = GenerativeModel("gemini-1.5-pro")

    # Generate response
    response = model.generate_content(prompt)

    # Extract text from the response
    text = "".join(
        part.text
        for part in response.candidates[0].content.parts
        if hasattr(part, "text")
    )

    # Parse JSON safely
    try:
        data = json.loads(text)
    except Exception:
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

from typing import Dict
import json
from vertexai.generative_models import GenerativeModel


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
    model = GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)

    text = "".join(
        part.text
        for part in response.candidates[0].content.parts
        if hasattr(part, "text")
    )

    try:
        data = json.loads(text)
    except Exception:
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
