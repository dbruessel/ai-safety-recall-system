import argparse
import datetime
import json
import logging
import time
import requests

from urllib.parse import quote
from google.cloud import firestore

# -----------------------------
# JSON Logging Setup
# -----------------------------

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log = {
            "timestamp": self.formatTime(record, self.datefmt),
            "severity": record.levelname,
            "message": record.getMessage(),
        }

        if hasattr(record, "fields") and isinstance(record.fields, dict):
            log.update(record.fields)

        return json.dumps(log)


handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())

logger = logging.getLogger("vin_ingestion")
logger.setLevel(logging.INFO)
logger.addHandler(handler)
logger.propagate = False


def log_event(message: str, **fields):
    logger.info(message, extra={"fields": fields})


# -----------------------------
# Firestore Setup
# -----------------------------
db = firestore.Client()
VIN_BATCHES = db.collection("vin_batches")
DECODED_VINS = db.collection("decoded_vins")


# -----------------------------
# Sanitization Helpers
# -----------------------------
def sanitize_vin(vin: str) -> str:
    """VINs should be uppercase and URL-safe."""
    return quote(vin.strip().upper())


# -----------------------------
# NHTSA VIN Decode
# -----------------------------
def decode_vin(vin: str):
    safe_vin = sanitize_vin(vin)
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{safe_vin}?format=json"

    response = requests.get(url)
    response.raise_for_status()
    data = response.json()

    log_event("Decoded VIN", event="vin_decoded", vin=vin)
    return data


def store_decoded_vin(vin: str, decoded_data: dict):
    DECODED_VINS.document(vin).set(decoded_data)
    log_event("Stored decoded VIN", event="vin_stored", vin=vin)


# -----------------------------
# Main Ingestion Logic
# -----------------------------
def run_ingestion(batch_id: str):
    log_event("Starting VIN batch ingestion", event="vin_ingestion_start", batch_id=batch_id)

    vins_ref = VIN_BATCHES.document(batch_id).collection("vins")
    vins = [doc.id for doc in vins_ref.stream()]

    log_event("Loaded VINs", event="vin_list_loaded", count=len(vins))

    for vin in vins:
        start_time = time.time()

        try:
            decoded = decode_vin(vin)
            store_decoded_vin(vin, decoded)

            duration_ms = int((time.time() - start_time) * 1000)
            log_event(
                "VIN processed",
                event="vin_processed",
                vin=vin,
                duration_ms=duration_ms,
            )

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            log_event(
                "VIN processing failed",
                event="vin_failed",
                vin=vin,
                duration_ms=duration_ms,
                error=str(e),
            )
            raise e

    log_event("VIN batch ingestion complete", event="vin_ingestion_complete", batch_id=batch_id)


# -----------------------------
# CLI Entrypoint
# -----------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VIN Batch Ingestion Job")
    parser.add_argument("--batch", required=True, help="VIN batch ID to process")
    args = parser.parse_args()

    run_ingestion(batch_id=args.batch)
