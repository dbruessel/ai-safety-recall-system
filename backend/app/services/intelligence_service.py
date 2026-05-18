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
