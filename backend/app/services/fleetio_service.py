import logging
import requests
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

FLEETIO_BASE_URL = "https://secure.fleetio.com/api/v1"


class FleetioService:
    def __init__(self, api_token: str, account_token: str):
        """
        Initializes the Fleetio API Service with the required headers.
        """
        self.headers = {
            "Authorization": f"Token token={api_token}",
            "Account-Token": account_token,
            "Content-Type": "application/json"
        }

    def fetch_active_vehicles(self) -> List[Dict[str, Any]]:
        """
        Fetches all active vehicles and VINs from Fleetio, handling pagination automatically.
        """
        url = f"{FLEETIO_BASE_URL}/vehicles"
        params = {
            "filter[status_eq]": "active",
            "per_page": 100
        }
        
        parsed_vehicles = []
        next_cursor = None

        while True:
            if next_cursor:
                params["start_cursor"] = next_cursor

            try:
                response = requests.get(url, headers=self.headers, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
            except requests.exceptions.RequestException as e:
                logger.error(f"Error communicating with Fleetio API: {str(e)}")
                raise Exception(f"Fleetio API Request failed: {str(e)}")

            # Fleetio returns a list or a dictionary containing records
            vehicles = data if isinstance(data, list) else data.get("records", [])

            for v in vehicles:
                # Extract VIN and sanitize
                vin = v.get("vin")
                if vin:
                    vin = vin.strip().upper()

                parsed_vehicles.append({
                    "fleetio_id": str(v.get("id")),
                    "vin": vin,
                    "make": v.get("make"),
                    "model": v.get("model"),
                    "year": v.get("year"),
                    "meter_reading": v.get("primary_meter_value"),
                    "name": v.get("name"),
                    "vehicle_type_name": v.get("vehicle_type_name")
                })

            # Check for cursor-based pagination
            if isinstance(data, dict) and data.get("next_cursor"):
                next_cursor = data.get("next_cursor")
            else:
                break

        logger.info(f"Successfully fetched {len(parsed_vehicles)} active vehicles from Fleetio.")
        return parsed_vehicles

    def create_safety_recall_issue(self, fleetio_vehicle_id: str, recall: Dict[str, Any]) -> Optional[str]:
        """
        Automatically posts a high-priority Issue in Fleetio when an open, high-severity 
        NHTSA recall is identified. Returns the created Fleetio Issue ID.
        """
        url = f"{FLEETIO_BASE_URL}/issues"

        component = recall.get("component", "SAFETY RECALL").upper()
        summary = recall.get("summary", "No summary provided.")
        campaign_number = recall.get("campaign_number", "N/A")
        remedy = recall.get("remedy", "Contact authorized OEM dealer for remedy.")

        payload = {
            "issue": {
                "vehicle_id": fleetio_vehicle_id,
                "summary": f"[RECALLLOGIC ALERT] NHTSA Recall #{campaign_number} - {component}",
                "description": (
                    f"⚠️ AUTOMATED NUCLEAR LIABILITY ALERT ⚠️\n\n"
                    f"Campaign Number: {campaign_number}\n"
                    f"Safety Component: {component}\n\n"
                    f"Summary:\n{summary}\n\n"
                    f"Required Remedy:\n{remedy}\n\n"
                    f"Legal & Insurance Liability Warning:\n"
                    f"Operating this vehicle with an unaddressed safety-critical recall exposes "
                    f"the business to severe legal liability and punitive damages in commercial litigation."
                ),
                "priority": "urgent",
                "labels": ["RecallLogic", "Safety-Critical", "Nuclear-Liability"]
            }
        }

        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=15)
            response.raise_for_status()
            issue_data = response.json()
            issue_id = str(issue_data.get("id"))
            logger.info(f"Successfully created Fleetio Issue #{issue_id} for Vehicle ID {fleetio_vehicle_id}")
            return issue_id
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to create Fleetio Issue for Vehicle ID {fleetio_vehicle_id}: {str(e)}")
            return None