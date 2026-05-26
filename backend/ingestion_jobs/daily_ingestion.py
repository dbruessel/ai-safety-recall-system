import argparse
import datetime
import json
import logging
import time

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
# Checkpoint Helpers
# -----------------------------
def load_last_run_timestamp():
    doc = DELTA_CHECKPOINT_DOC.get()
    if doc.exists:
        ts = doc.to_dict().get("last_run")
        log_event("Loaded daily delta checkpoint", event="delta_checkpoint_loaded", last_run=str(ts))
        return ts

    log_event("No daily delta checkpoint found. Defaulting to 24 hours ago.", event="delta_checkpoint_missing")
    return datetime.datetime.utcnow() - datetime.timedelta(days=1)


def save_last_run_timestamp():
    now = datetime.datetime.utcnow()
    DELTA_CHECKPOINT_DOC.set({"last_run": now})
    log_event("Daily delta checkpoint saved", event="delta_checkpoint_saved", last_run=str(now))


# -----------------------------
# Mocked External API Call
# Replace with your real NHTSA delta fetch
# -----------------------------
def fetch_recalls_since(timestamp):
    """
    Replace this with your real NHTSA delta ingestion logic.
    Should return a list of recall objects.
    """
    log_event("Fetching delta recalls", event="delta_fetch_start", since=str(timestamp))

    # Simulated recall list
    return [
        {
            "recall_number": "24V123",
            "make": "FORD",
            "model": "F-150",
            "year": 2022,
            "description": "Simulated recall",
            "timestamp": datetime.datetime.utcnow().isoformat(),
        }
    ]


# -----------------------------
# Firestore Write
# -----------------------------
def store_recall(recall):
    recall_id = recall["recall_number"]

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

    log_event("Delta recalls fetched", event="delta_fetch_complete", count=len(recalls))

    for recall in recalls:
        try:
            store_recall(recall)
        except Exception as e:
            log_event(
                "Failed to store recall",
                event="delta_store_failed",
                recall_number=recall.get("recall_number"),
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
