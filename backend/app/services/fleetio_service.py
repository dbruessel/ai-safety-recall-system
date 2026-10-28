import logging
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import requests
from app.config import settings

logger = logging.getLogger(__name__)

FLEETIO_BASE_URL = "https://secure.fleetio.com/api/v1"


class FleetioService:
    def __init__(self, api_token: Optional[str] = None, account_token: Optional[str] = None):
        """
        Initializes the Fleetio API Service with required headers.
        Falls back to environment variables if parameters are omitted.
        """
        raw_api_key = api_token or os.getenv("FLEETIO_API_KEY") or getattr(settings, "FLEETIO_API_KEY", "")
        raw_account_token = account_token or os.getenv("FLEETIO_ACCOUNT_TOKEN") or getattr(settings, "FLEETIO_ACCOUNT_TOKEN", "")

        if not raw_api_key or not raw_account_token:
            raise ValueError("Fleetio API credentials missing: Both FLEETIO_API_KEY and FLEETIO_ACCOUNT_TOKEN are required.")

        clean_api_key = raw_api_key.strip()
        auth_header = clean_api_key if clean_api_key.startswith("Token ") else f"Token {clean_api_key}"

        self.account_token = raw_account_token.strip()
        self.headers = {
            "Authorization": auth_header,
            "Account-Token": self.account_token,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def fetch_active_vehicles(self) -> List[Dict[str, Any]]:
        """
        Fetches all active vehicles and VINs from Fleetio, handling pagination automatically.
        """
        url = f"{FLEETIO_BASE_URL}/vehicles"
        params = {"per_page": 100}
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

            vehicles = data if isinstance(data, list) else data.get("records", [])

            for v in vehicles:
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

            if isinstance(data, dict) and data.get("next_cursor"):
                next_cursor = data.get("next_cursor")
            else:
                break

        logger.info(f"Successfully fetched {len(parsed_vehicles)} active vehicles from Fleetio.")
        return parsed_vehicles

    def get_vehicle_work_orders(self, fleetio_vehicle_id: str) -> List[Dict[str, Any]]:
        """
        Queries Fleetio for existing work orders tied to a specific vehicle.
        """
        url = f"{FLEETIO_BASE_URL}/work_orders"
        try:
            res = requests.get(url, headers=self.headers, params={"per_page": 100}, timeout=15)
            if res.status_code == 200:
                data = res.json()
                records = data if isinstance(data, list) else data.get("records", [])
                target_id = str(fleetio_vehicle_id)
                # Match work orders belonging to this vehicle
                return [wo for wo in records if str(wo.get("vehicle_id")) == target_id]
        except Exception as e:
            logger.error(f"Failed to query Fleetio work orders for vehicle {fleetio_vehicle_id}: {e}")
        return []

    def get_open_work_order_status_id(self) -> Optional[int]:
        """
        Queries Fleetio work order statuses to resolve the ID for the 'Open' state.
        """
        url = f"{FLEETIO_BASE_URL}/work_order_statuses"
        try:
            res = requests.get(url, headers=self.headers, timeout=10)
            res.raise_for_status()
            data = res.json()
            records = data if isinstance(data, list) else data.get("records", [])

            for status in records:
                if "open" in str(status.get("name", "")).lower():
                    return status.get("id")

            if records:
                return records[0].get("id")
            return None
        except Exception as e:
            logger.error(f"Failed to query Fleetio work order statuses: {str(e)}")
            return None

    def create_work_order(self, fleetio_vehicle_id: str, recall: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Generates a live Fleetio Work Order with required issued_at and status fields.
        """
        url = f"{FLEETIO_BASE_URL}/work_orders"
        open_status_id = self.get_open_work_order_status_id()

        if not open_status_id:
            logger.error("Cannot create Fleetio Work Order: No valid open status ID found.")
            return None

        component = recall.get("component", "SAFETY RECALL").upper()
        campaign_number = recall.get("campaign_number", "N/A")
        issued_at_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        payload = {
            "vehicle_id": int(fleetio_vehicle_id) if str(fleetio_vehicle_id).isdigit() else fleetio_vehicle_id,
            "work_order_status_id": open_status_id,
            "issued_at": issued_at_iso,
            "description": f"RECALLLOGIC PRIORITY SAFETY: NHTSA Campaign #{campaign_number} ({component}) Remediation"
        }

        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=15)
            response.raise_for_status()
            wo_data = response.json()
            wo_id = str(wo_data.get("id"))
            wo_number = str(wo_data.get("number", wo_id))

            logger.info(f"Successfully created Fleetio Work Order #{wo_number} (ID: {wo_id}) for Vehicle ID {fleetio_vehicle_id}")
            return {"id": wo_id, "number": wo_number}
        except requests.exceptions.RequestException as e:
            error_details = response.text if "response" in locals() and response is not None else str(e)
            logger.error(f"Failed to create Fleetio Work Order for Vehicle {fleetio_vehicle_id}: {error_details}")
            return None

    def create_safety_recall_issue(self, fleetio_vehicle_id: str, recall: Dict[str, Any]) -> Optional[str]:
        """
        Creates a high-priority Issue in Fleetio.
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