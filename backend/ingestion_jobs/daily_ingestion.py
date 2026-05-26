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

logger = logging.getLogger("daily_ingestion")
logger.setLevel(logging.INFO)
logger.addHandler(handler)
logger.propagate = False


def log_event(message: str, **fields):
    logger.info(message, extra={"fields": fields})


# -----------------------------
# Firestore Setup
# -----------------------------
db = firestore.Client()

RECALLS_COLLECTION = db.collection("recalls")
DELTA_CHECKPOINT_DOC = db.collection("ingestion_checkpoints").document("daily_delta")


# -----------------------------
# Sanitization Helpers
# -----------------------------
def sanitize(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    cleaned = cleaned.replace("/", "")
    cleaned = cleaned.replace("&", "")
    cleaned = cleaned.replace("#", "")
    cleaned = cleaned.replace("  ", " ")
    return quote(cleaned)


# -----------------------------
# Checkpoint Helpers
# -----------------------------
def load_last_run_timestamp():
    doc = DELTA_CHECKPOINT_DOC.get()
    if doc.exists:
        ts = doc.to_dict().get("last_run")
        log_event("Loaded daily delta checkpoint", event="delta_checkpoint_loaded", last_run=str(ts))
        return ts

    fallback = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    log_event("No daily delta checkpoint found. Defaulting to 24 hours ago.", event="delta_checkpoint_missing")
    return fallback


def save_last_run_timestamp():
    now = datetime.datetime.utcnow()
    DELTA_CHECKPOINT_DOC.set({"last_run": now})
    log_event("Daily delta checkpoint saved", event="delta_checkpoint_saved", last_run=str(now))


# -----------------------------
# REAL NHTSA Delta API Call
# -----------------------------
def fetch_recalls_since(timestamp):
    """
    Fetch recalls updated since the given timestamp.
    Uses the official NHTSA delta endpoint.
    """
    iso_date = timestamp.strftime("%Y-%m-%d")

    url = f"https://api.nhtsa.gov/recalls/recallsByDate?date={iso_date}"

    log_event("Fetching delta recalls", event="delta_fetch_start", url=url)

    response = requests.get(url)
    response.raise_for_status()

    data = response.json()
    results = data.get("results", [])

    log_event("Delta recalls fetched", event="delta_fetch_complete", count=len(results))

    return results


# -----------------------------
# Firestore Write
# -----------------------------
def store_recall(recall):
    recall_id = recall.get("NHTSACampaignNumber") or f"recall-{time.time()}"

    # Sanitize fields before storing
    recall["make"] = sanitize(recall.get("Make", ""))
    recall["model"] = sanitize(recall.get("Model", ""))
    recall["year"] = recall.get("ModelYear")

    RECALLS_COLLECTION.document(recall_id).set(recall)

    log_event(
        "Stored recall",
        event="delta_recall_stored",
        recall_number=recall_id,
        make=recall.get("make"),
        model=recall.get("model"),
        year=recall.get("year"),
    )


# -----------------------------
# Main Daily Ingestion Logic
# -----------------------------
def run_daily_ingestion():
    log_event("Starting daily ingestion run", event="daily_ingestion_start")

    last_run = load_last_run_timestamp()

    recalls = fetch_recalls_since(last_run)

    for recall in recalls:
        try:
            store_recall(recall)
        except Exception as e:
            log_event(
                "Failed to store recall",
                event="delta_store_failed",
                recall_number=recall.get("NHTSACampaignNumber"),
                error=str(e),
            )
            raise e

    save_last_run_timestamp()

    log_event("Daily ingestion complete", event="daily_ingestion_complete")


# -----------------------------
# CLI Entrypoint
# -----------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Daily Recall Delta Ingestion Job")
    args = parser.parse_args()

    run_daily_ingestion()
