from datetime import datetime

def _to_iso(date_str):
    if not date_str:
        return None

    # Try common NHTSA formats
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    # If parsing fails, return original
    return date_str


def _normalize_component(raw_component):
    if not raw_component:
        return "Other"

    c = raw_component.upper()

    mapping = {
        "ELECTRICAL": "Electrical",
        "ELECTRICAL SYSTEM": "Electrical",
        "ENGINE": "Engine",
        "ENGINE AND ENGINE COOLING": "Engine",
        "SERVICE BRAKES": "Brakes",
        "SERVICE BRAKES, HYDRAULIC": "Brakes",
        "STEERING": "Steering",
        "AIR BAGS": "Airbags",
        "POWER TRAIN": "Powertrain",
    }

    for key, value in mapping.items():
        if key in c:
            return value

    return "Other"


def _score_severity(summary, consequence):
    text = f"{summary or ''} {consequence or ''}".lower()

    high_terms = [
        "fire", "fuel leak", "fuel leakage",
        "brake failure", "loss of braking",
        "steering loss", "loss of steering",
        "airbag", "air bag", "explosion",
        "loss of control"
    ]
    medium_terms = [
        "stall", "stalling",
        "software", "calibration",
        "lighting", "headlamp", "tail lamp",
        "emission", "emissions"
    ]

    if any(t in text for t in high_terms):
        return "High"
    if any(t in text for t in medium_terms):
        return "Medium"
    return "Low"


def normalize_recall(raw):
    campaign_number = raw.get("NHTSACampaignNumber") or raw.get("CampaignNumber")
    make = (raw.get("Make") or "").strip().upper()
    model = (raw.get("Model") or "").strip()
    year = raw.get("ModelYear")

    summary = (raw.get("Summary") or "").strip()
    consequence = (raw.get("Consequence") or raw.get("Conequence") or "").strip()
    remedy = (raw.get("Remedy") or "").strip()
    notes = (raw.get("Notes") or "").strip()

    component = _normalize_component(raw.get("Component"))

    report_date = _to_iso(raw.get("ReportReceivedDate"))
    manufactured_from = _to_iso(raw.get("ManufacturedFrom"))
    manufactured_to = _to_iso(raw.get("ManufacturedTo"))

    severity_score = _score_severity(summary, consequence)
    text = f"{summary} {consequence}".lower()

    is_fire_risk = "fire" in text or "fuel leak" in text or "fuel leakage" in text
    is_parking_risk = "rollaway" in text or "roll away" in text or "park" in text
    is_safety_critical = severity_score == "High"

    return {
        "campaign_number": campaign_number,
        "make": make,
        "model": model,
        "year": int(year) if year else None,

        "component": component,
        "summary": summary,
        "consequence": consequence,
        "remedy": remedy,
        "notes": notes,

        "report_date": report_date,
        "manufactured_from": manufactured_from,
        "manufactured_to": manufactured_to,

        "severity_score": severity_score,
        "is_safety_critical": is_safety_critical,
        "is_parking_risk": is_parking_risk,
        "is_fire_risk": is_fire_risk,

        "source": "NHTSA"
    }
