import os
import requests
from typing import List, Dict, Any
from app.config import settings

FLEETIO_BASE_URL = "https://secure.fleetio.com/api/v1"

class FleetioService:
    def __init__(self, api_token: str, account_token: str):
        self.headers = {
            "Authorization": f"Token token={api_token}",
            "Account-Token": account_token,
            "Content-Type": "application/json"
        }

    def fetch_active_vehicles(self) -> List[Dict[str, Any]]:
        """
        Fetches all active vehicles and VINs from Fleetio.
        """
        url = f"{FLEETIO_BASE_URL}/vehicles"
        params = {"filter[status_eq]": "active"}
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        
        vehicles = response.json()
        parsed_vehicles = []
        for v in vehicles:
            parsed_vehicles.append({
                "fleetio_id": str(v.get("id")),
                "vin": v.get("vin"),
                "make": v.get("make"),
                "model": v.get("model"),
                "year": v.get("year"),
                "meter_reading": v.get("primary_meter_value"),
                "name": v.get("name")
            })
        return parsed_vehicles

    def create_safety_recall_issue(self, fleetio_vehicle_id: str, recall: Dict[str, Any]) -> str:
        """
        Automatically posts a high-priority Issue in Fleetio when an open NHTSA recall is identified.
        """
        url = f"{FLEETIO_BASE_URL}/issues"
        
        # High liability components get urgent tags
        component = recall.get("component", "General").upper()
        summary = recall.get("summary", "No summary provided.")
        campaign_number = recall.get("campaign_number", "N/A")
        
        payload = {
            "issue": {
                "vehicle_id": fleetio_vehicle_id,
                "summary": f"[RECALLLOGIC ALERT] NHTSA Recall #{campaign_number} - {component}",
                "description": (
                    f"AUTOMATED NUCLEAR LIABILITY ALERT\n\n"
                    f"Campaign: {campaign_number}\n"
                    f"Component: {component}\n"
                    f"Summary: {summary}\n\n"
                    f"Remedy: {recall.get('remedy', 'Contact OEM Dealer')}\n\n"
                    f"Warning: Operating this vehicle with an unaddressed safety recall exposes "
                    f"the fleet to punitive damage claims in commercial litigation."
                ),
                "priority": "urgent",
                "labels": ["RecallLogic", "Safety-Critical", "Open-Recall"]
            }
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json().get("id")