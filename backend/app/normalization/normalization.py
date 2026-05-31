def normalize_campaign(raw, make, model, year):
    campaign_number = raw.get("NHTSACampaignNumber") or raw.get("CampaignNumber")

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
        "make": make.upper(),
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

        "source": "NHTSA",

        # Worker expects these timestamps
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),

        # Worker expects this URL
        "nhtsa_url": f"https://www.nhtsa.gov/recalls?nhtsaId={campaign_number}",
    }
