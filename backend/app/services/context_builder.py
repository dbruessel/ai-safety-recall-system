from typing import Dict, Any
from datetime import datetime


def _get_vehicle_context(vin: str, decoded_data: Dict) -> Dict:
    """
    Build structured vehicle context from VIN decode.
    """
    return {
        "vin": vin,
        "make": decoded_data.get("make"),
        "model": decoded_data.get("model"),
        "model_year": decoded_data.get("model_year"),
        "body_class": decoded_data.get("body_class"),
        "fuel_type": decoded_data.get("fuel_type"),
    }


def _get_weather_context(location: Dict) -> Dict:
    """
    Placeholder for weather integration (OpenWeather, NOAA, etc.).
    `location` might contain: { "lat": ..., "lon": ... } or { "zip": ... }.

    For now, returns a static structure you can later wire to a real API.
    """
    # TODO: Replace with real weather API call
    return {
        "source": "stub",
        "conditions": "unknown",
        "temperature_c": None,
        "precipitation": None,
        "alerts": [],
        "retrieved_at": datetime.utcnow().isoformat() + "Z",
    }


def _get_geographic_risk(location: Dict) -> Dict:
    """
    Placeholder for geographic risk scoring.
    Later: salt belt, flood zones, wildfire zones, hurricane regions, etc.
    """
    # TODO: Replace with real geographic risk logic
    return {
        "region": location.get("region", "unknown"),
        "salt_belt": False,
        "flood_prone": False,
        "wildfire_risk": False,
        "hurricane_risk": False,
        "overall_geographic_risk": "unknown",
    }


def _get_seasonal_risk(now: datetime, location: Dict) -> Dict:
    """
    Simple seasonal risk stub based on month.
    Later: tie to real climate + seasonal patterns.
    """
    month = now.month

    if month in [12, 1, 2]:
        season = "winter"
        primary_risks = ["ice", "snow", "cold_start_issues"]
    elif month in [3, 4, 5]:
        season = "spring"
        primary_risks = ["rain", "flooding", "potholes"]
    elif month in [6, 7, 8]:
        season = "summer"
        primary_risks = ["overheating", "tire_blowouts", "AC_load"]
    else:
        season = "fall"
        primary_risks = ["rain", "early_cold_snaps", "visibility"]

    return {
        "season": season,
        "primary_risks": primary_risks,
    }


def build_context(
    vin: str,
    decoded_data: Dict,
    recalls: Dict,
    location: Dict | None = None,
) -> Dict[str, Any]:
    """
    Build the full intelligence context object that will be passed to Gemini.

    `location` can be:
      - None (no location known)
      - { "zip": "89135", "region": "NV" }
      - { "lat": 36.1699, "lon": -115.1398, "region": "NV" }
    """

    location = location or {}

    vehicle_context = _get_vehicle_context(vin, decoded_data)
    weather_context = _get_weather_context(location)
    geographic_risk = _get_geographic_risk(location)
    seasonal_risk = _get_seasonal_risk(datetime.utcnow(), location)

    return {
        "vin": vin,
        "vehicle": vehicle_context,
        "recalls": recalls,
        "weather": weather_context,
        "geographic_risk": geographic_risk,
        "seasonal_risk": seasonal_risk,
        "location": location,
    }
