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
        Falls back to environment variables or settings if parameters are omitted.
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

    def test_connection(self) -> Dict[str, Any]:
        """
        Validates credentials against Fleetio endpoint.
        Used for onboarding handshakes and setting checks.
        """
        url = f"{FLEETIO_BASE_URL}/vehicles"
        try:
            res = requests.get(url, headers=self.headers, params={"per_page": 1}, timeout=10)
            if res.status_code == 200:
                return {"valid": True, "error": None}
            if res.status_code == 401:
                return {"valid": False, "error": "Invalid API Key or Account Token."}
            return {"valid": False, "error": f"Fleetio returned HTTP {res.status_code}"}
        except Exception as e:
            logger.error(f"Failed to connect to Fleetio: {str(e)}")
            return {"valid": False, "error": str(e)}

    def fetch_active_vehicles(self) -> List[Dict[str, Any]]:
        """
        Fetches active highway vehicles from Fleetio, handling pagination automatically.
        Enforces 17-character standard automotive VINs to filter out shop equipment/forklifts.
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
                raw_vin = v.get("vin")
                status = str(v.get("vehicle_status_name", "")).strip().lower()
                
                if not raw_vin:
                    continue

                clean_vin = raw_vin.strip().upper()

                # Partner Certification Rule: Filter out non-17 character assets (forklifts, shop equipment)
                if len(clean_vin) != 17:
                    logger.debug(f"Skipping non-standard VIN asset: {v.get('name')} ({clean_vin})")
                    continue

                # Only include active assets
                if status != "active":
                    continue

                parsed_vehicles.append({
                    "fleetio_id": str(v.get("id")),
                    "vin": clean_vin,
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

        logger.info(f"Successfully fetched {len(parsed_vehicles)} active highway vehicles from Fleetio.")
        return parsed_vehicles

    def check_existing_issue(self, fleetio_vehicle_id: str, campaign_number: str) -> Optional[Dict[str, Any]]:
        """
        Deduplication Check: Queries Fleetio issues for a vehicle using Ransack syntax (q[vehicle_id_eq])
        to verify if an issue with the campaign ID already exists.
        """
        url = f"{FLEETIO_BASE_URL}/issues"
        params = {"q[vehicle_id_eq]": fleetio_vehicle_id}

        try:
            res = requests.get(url, headers=self.headers, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                issues = data.get("records", []) if isinstance(data, dict) else data

                for issue in issues:
                    summary = issue.get("summary", "")
                    desc = issue.get("description", "")
                    state = str(issue.get("state", "")).lower()

                    if (campaign_number in summary or campaign_number in desc) and state != "resolved":
                        logger.info(f"Existing open issue #{issue.get('id')} found for Campaign {campaign_number}. Skipping creation.")
                        return issue
        except Exception as e:
            logger.error(f"Error querying existing Fleetio issues for vehicle {fleetio_vehicle_id}: {str(e)}")
        
        return None

    def create_safety_recall_issue(self, fleetio_vehicle_id: str, recall: Dict[str, Any]) -> Optional[str]:
        """
        Creates an Issue in Fleetio with required ISO-8601 reported_at timestamp
        and deduplication guard.
        """
        campaign_number = str(recall.get("campaign_number", "N/A")).strip()
        
        # 1. Deduplication Guard: Check if ticket already exists
        existing = self.check_existing_issue(fleetio_vehicle_id, campaign_number)
        if existing:
            return str(existing.get("id"))

        url = f"{FLEETIO_BASE_URL}/issues"
        component = recall.get("component", "SAFETY RECALL").upper()
        summary_text = recall.get("summary", "No summary provided.")
        remedy = recall.get("remedy", "Contact authorized OEM dealer for remedy.")
        
        # Fleetio requires an ISO-8601 timestamp for reported_at
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        v_id = int(fleetio_vehicle_id) if str(fleetio_vehicle_id).isdigit() else fleetio_vehicle_id

        # Flat payload matching Fleetio v1 API schema
        payload = {
            "vehicle_id": v_id,
            "summary": f"SAFETY RECALL: NHTSA #{campaign_number} - {component}",
            "description": (
                f"RecallLogic detected an active unaddressed safety recall.\n\n"
                f"Component: {component}\n"
                f"NHTSA Campaign: {campaign_number}\n"
                f"Summary: {summary_text}\n"
                f"Required Remedy: {remedy}\n\n"
                f"Verified automatically via RecallLogic Intelligence."
            ),
            "reported_at": now_iso
        }

        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=15)
            response.raise_for_status()
            issue_data = response.json()
            issue_id = str(issue_data.get("id"))
            logger.info(f"Successfully created Fleetio Issue #{issue_id} for Vehicle ID {fleetio_vehicle_id}")
            return issue_id
        except requests.exceptions.RequestException as e:
            err_msg = response.text if "response" in locals() and response is not None else str(e)
            logger.error(f"Failed to create Fleetio Issue for Vehicle ID {fleetio_vehicle_id}: {err_msg}")
            return None

    def get_vehicle_work_orders(self, fleetio_vehicle_id: str) -> List[Dict[str, Any]]:
        """
        Queries Fleetio for existing work orders tied to a specific vehicle.
        """
        url = f"{FLEETIO_BASE_URL}/work_orders"
        try:
            res = requests.get(url, headers=self.headers, params={"q[vehicle_id_eq]": fleetio_vehicle_id}, timeout=15)
            if res.status_code == 200:
                data = res.json()
                return data.get("records", []) if isinstance(data, dict) else data
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

    def create_work_order(
        self,
        fleetio_vehicle_id: str,
        recall: Dict[str, Any],
        vin: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
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
        summary = recall.get("summary", "Safety defect identified by NHTSA.")
        remedy = recall.get("remedy", "Contact authorized OEM dealer for campaign remediation.")
        target_vin = vin or recall.get("vin", "")
        issued_at_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        dossier_url = f"https://recalllogic.ai/vehicles/{target_vin}" if target_vin else "https://recalllogic.ai"

        description_text = (
            f"RECALLLOGIC DEFECT REMEDIATION: NHTSA Campaign #{campaign_number} ({component})\n\n"
            f"Summary:\n{summary}\n\n"
            f"Required Remedy:\n{remedy}\n\n"
            f"Compliance Defense Dossier: {dossier_url}\n\n"
            f"Note: Marking this Work Order 'Completed' or 'Closed' automatically verifies compliance."
        )

        payload = {
            "vehicle_id": int(fleetio_vehicle_id) if str(fleetio_vehicle_id).isdigit() else fleetio_vehicle_id,
            "work_order_status_id": open_status_id,
            "issued_at": issued_at_iso,
            "description": description_text
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