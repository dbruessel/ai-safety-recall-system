import base64
import hashlib
import hmac
import logging
import os
import time
from typing import Any, Dict, List, Optional
import requests

logger = logging.getLogger(__name__)

SAMSARA_BASE_URL = "https://api.samsara.com"


class SamsaraService:
    def __init__(self, api_token: Optional[str] = None):
        self.api_token = (api_token or os.getenv("SAMSARA_API_TOKEN") or "").strip()
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{SAMSARA_BASE_URL}{path}"
        for attempt in range(3):
            resp = requests.get(url, headers=self.headers, params=params, timeout=15)
            if resp.status_code == 429:
                retry_after = float(resp.headers.get("Retry-After", "1.0"))
                time.sleep(retry_after)
                continue
            resp.raise_for_status()
            return resp.json()
        raise RuntimeError("Samsara API rate limit (429) exceeded after retries.")

    def fetch_odometer_map(self) -> Dict[str, float]:
        """
        Pulls latest OBD/GPS odometer readings (converted from meters to miles)
        keyed by Samsara vehicle ID. Requires Telematics - Essential + Read Vehicle Statistics.
        """
        odometer_by_id: Dict[str, float] = {}
        try:
            payload = self._get(
                "/fleet/vehicles/stats",
                params={"types": "obdOdometerMeters,gpsOdometerMeters"},
            )
            for entry in payload.get("data", []):
                veh_id = str(entry.get("id", ""))
                obd = entry.get("obdOdometerMeters") or entry.get("gpsOdometerMeters")
                if veh_id and isinstance(obd, dict) and obd.get("value") is not None:
                    miles = round(float(obd["value"]) / 1609.344, 1)
                    odometer_by_id[veh_id] = miles
        except Exception as err:
            logger.warning(f"Could not fetch Samsara odometer stats (continuing without meters): {err}")
        return odometer_by_id

    def fetch_active_vehicles(self, include_odometer: bool = True) -> List[Dict[str, Any]]:
        """
        Cursor-paginated pull of all fleet vehicles from Samsara, normalized
        to match RecallLogic's vehicle_dict structure.
        """
        odometer_map = self.fetch_odometer_map() if include_odometer else {}
        normalized_vehicles: List[Dict[str, Any]] = []
        after_cursor: Optional[str] = None

        while True:
            params: Dict[str, Any] = {"limit": 512}
            if after_cursor:
                params["after"] = after_cursor

            payload = self._get("/fleet/vehicles", params=params)
            for item in payload.get("data", []):
                vin = (item.get("vin") or "").strip().upper()
                if not vin:
                    continue

                samsara_id = str(item.get("id", ""))
                normalized_vehicles.append({
                    "samsara_id": samsara_id,
                    "id": samsara_id,
                    "vin": vin,
                    "name": item.get("name"),
                    "make": item.get("make"),
                    "model": item.get("model"),
                    "year": item.get("year"),
                    "license_plate": item.get("licensePlate"),
                    "meter_reading": odometer_map.get(samsara_id),
                })

            pagination = payload.get("pagination") or {}
            if not pagination.get("hasNextPage"):
                break
            after_cursor = pagination.get("endCursor")

        return normalized_vehicles

    def fetch_vehicle_by_id(self, vehicle_id: str) -> Optional[Dict[str, Any]]:
        """Fetches a single vehicle from Samsara when a webhook payload omits full VIN metadata."""
        try:
            payload = self._get(f"/fleet/vehicles/{vehicle_id}")
            item = payload.get("data") or payload
            if not item or not item.get("vin"):
                return None
            return {
                "samsara_id": str(item.get("id", vehicle_id)),
                "id": str(item.get("id", vehicle_id)),
                "vin": str(item["vin"]).strip().upper(),
                "name": item.get("name"),
                "make": item.get("make"),
                "model": item.get("model"),
                "year": item.get("year"),
            }
        except Exception as err:
            logger.error(f"Error fetching Samsara vehicle {vehicle_id}: {err}")
            return None

    @staticmethod
    def verify_webhook_signature(
        raw_body: bytes,
        timestamp_header: str,
        signature_header: str,
        base64_secret: str,
        tolerance_seconds: int = 300,
    ) -> bool:
        """
        Verifies Samsara Webhooks 2.0 HMAC-SHA256 signature:
        signed_payload = b"v1:<X-Samsara-Timestamp>:" + raw_body
        """
        if not timestamp_header or not signature_header or not base64_secret:
            return False
        try:
            ts = int(timestamp_header)
        except ValueError:
            return False

        if abs(int(time.time()) - ts) > tolerance_seconds:
            return False

        secret_bytes = base64.b64decode(base64_secret)
        signed_payload = f"v1:{timestamp_header}:".encode("utf-8") + raw_body
        digest = hmac.new(secret_bytes, signed_payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(f"v1={digest}", signature_header)