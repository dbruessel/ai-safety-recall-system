import asyncio
import base64
import hashlib
import hmac
import time
from typing import Any, Dict, List, Optional
import httpx

SAMSARA_BASE_URL = "https://api.samsara.com"


class SamsaraAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(f"Samsara API ({status_code}): {message}")


class SamsaraAdapter:
    def __init__(self, api_token: str, timeout: float = 20.0):
        self.api_token = api_token.strip()
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        self.timeout = timeout

    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        url = f"{SAMSARA_BASE_URL}{path}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(max_retries):
                resp = await client.request(
                    method, url, headers=self.headers, params=params, json=json_body
                )
                if resp.status_code == 429:
                    retry_after = float(resp.headers.get("Retry-After", "1.0"))
                    await asyncio.sleep(retry_after)
                    continue
                if resp.status_code >= 400:
                    raise SamsaraAPIError(resp.status_code, resp.text)
                return resp.json()
        raise SamsaraAPIError(429, "Samsara rate limit exceeded after retries")

    async def verify_connection(self) -> Dict[str, Any]:
        """Lightweight call to validate token scopes (Read Vehicles)."""
        data = await self._request("GET", "/fleet/vehicles", params={"limit": 1})
        return {"connected": True, "sample_count": len(data.get("data", []))}

    async def fetch_all_vehicles(self) -> List[Dict[str, Any]]:
        """Cursor-paginated pull of all fleet vehicles with valid VINs."""
        vehicles: List[Dict[str, Any]] = []
        after_cursor: Optional[str] = None

        while True:
            params: Dict[str, Any] = {"limit": 512}
            if after_cursor:
                params["after"] = after_cursor

            payload = await self._request("GET", "/fleet/vehicles", params=params)
            for item in payload.get("data", []):
                vin = (item.get("vin") or "").strip().upper()
                if len(vin) != 17:
                    continue
                vehicles.append(
                    {
                        "external_id": str(item.get("id")),
                        "source": "samsara",
                        "vin": vin,
                        "unit_name": item.get("name") or f"Unit-{item.get('id')}",
                        "make": item.get("make"),
                        "model": item.get("model"),
                        "year": item.get("year"),
                        "license_plate": item.get("licensePlate"),
                    }
                )

            pagination = payload.get("pagination") or {}
            if not pagination.get("hasNextPage"):
                break
            after_cursor = pagination.get("endCursor")

        return vehicles

    async def fetch_vehicle_telemetry_snapshot(
        self, vehicle_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Pulls latest odometer and diagnostic fault codes for risk prioritization."""
        params: Dict[str, Any] = {"types": "obdOdometerMeters,faultCodes"}
        if vehicle_ids:
            params["vehicleIds"] = ",".join(vehicle_ids[:100])
        payload = await self._request("GET", "/fleet/vehicles/stats", params=params)
        return payload.get("data", [])

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
        base_string = f"v1:{timestamp}:{raw_body}"
        expected = f"v1={hmac_sha256_hex}"
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
        signed_payload = (
            f"v1:{timestamp_header}:".encode("utf-8") + raw_body
        )
        digest = hmac.new(secret_bytes, signed_payload, hashlib.sha256).hexdigest()
        expected = f"v1={digest}"
        return hmac.compare_digest(expected, signature_header)