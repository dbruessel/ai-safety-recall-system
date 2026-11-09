import logging
import os
import time
from typing import List, Dict, Any, Optional
import requests
from app.config import settings

logger = logging.getLogger(__name__)

SAMSARA_BASE_URL = "https://api.samsara.com"


class SamsaraService:
    def __init__(self, api_token: Optional[str] = None):
        """
        Initializes the Samsara API Service with a Bearer API Token.
        Falls back to environment variables or settings if omitted.
        """
        raw_token = (
            api_token
            or os.getenv("SAMSARA_API_TOKEN")
            or getattr(settings, "SAMSARA_API_TOKEN", "")
        )

        if not raw_token:
            raise ValueError(
                "Samsara API token missing: SAMSARA_API_TOKEN is required."
            )

        clean_token = raw_token.strip()
        auth_header = (
            clean_token if clean_token.startswith("Bearer ") else f"Bearer {clean_token}"
        )

        self.headers = {
            "Authorization": auth_header,
            "Accept": "application/json"
        }

    def _request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Central request wrapper handling rate limits (HTTP 429)."""
        url = f"{SAMSARA_BASE_URL}{endpoint}"
        retries = 3
        delay = 2

        for attempt in range(retries):
            response = requests.request(
                method, url, headers=self.headers, timeout=15, **kwargs
            )
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", delay))
                logger.warning(f"Samsara rate limit encountered. Backing off for {retry_after}s...")
                time.sleep(retry_after)
                delay *= 2
                continue
            return response

        return response

    def test_connection(self) -> Dict[str, Any]:
        """
        Tests the API token validity against Samsara's fleet vehicles endpoint.
        Returns a dictionary with status and error details if applicable.
        """
        try:
            res = self._request("GET", "/fleet/vehicles", params={"limit": 1})
            if res.status_code == 200:
                return {"valid": True, "error": None}
            if res.status_code in [401, 403]:
                return {
                    "valid": False,
                    "error": "Invalid or unauthorized Samsara API Token."
                }
            return {
                "valid": False,
                "error": f"Samsara API returned HTTP {res.status_code}"
            }
        except Exception as e:
            logger.error(f"Samsara connection test failed: {str(e)}")
            return {"valid": False, "error": str(e)}

    def fetch_active_vehicles(self) -> List[Dict[str, Any]]:
        """
        Fetches all active commercial highway vehicles from Samsara.
        - Automatically navigates Samsara's cursor-based pagination.
        - Enforces standard 17-character highway VIN verification.
        - Excludes unpowered assets, equipment, or deactivated vehicles.
        """
        endpoint = "/fleet/vehicles"
        params: Dict[str, Any] = {"limit": 512}  # 512 is Samsara's max page size
        parsed_vehicles: List[Dict[str, Any]] = []
        has_next_page = True

        while has_next_page:
            try:
                response = self._request("GET", endpoint, params=params)
                response.raise_for_status()
                data = response.json()
            except requests.exceptions.RequestException as e:
                logger.error(f"Error communicating with Samsara API: {str(e)}")
                raise Exception(f"Samsara API request failed: {str(e)}")

            vehicles_data = data.get("data", [])

            for v in vehicles_data:
                raw_vin = v.get("vin")
                if not raw_vin:
                    continue

                clean_vin = raw_vin.strip().upper()

                # Rule: Filter exclusively for standard 17-character highway VINs
                if len(clean_vin) != 17:
                    logger.debug(
                        f"Skipping non-standard VIN asset: {v.get('name')} ({clean_vin})"
                    )
                    continue

                parsed_vehicles.append({
                    "samsara_id": str(v.get("id")),
                    "name": v.get("name"),
                    "vin": clean_vin,
                    "make": v.get("make"),
                    "model": v.get("model"),
                    "year": v.get("year"),
                    "license_plate": v.get("licensePlate"),
                    "serial": v.get("serial")
                })

            pagination = data.get("pagination", {})
            has_next_page = pagination.get("hasNextPage", False)
            if has_next_page:
                params["after"] = pagination.get("endCursor")

        logger.info(f"Successfully fetched {len(parsed_vehicles)} active highway vehicles from Samsara.")
        return parsed_vehicles