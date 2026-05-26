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

logger = logging.getLogger("ingestion")
logger.setLevel(logging.INFO)
logger.addHandler(handler)
logger.propagate = False


def log_event(message: str, **fields):
    logger.info(message, extra={"fields": fields})


# -----------------------------
# Firestore Setup
# -----------------------------
db = firestore.Client()
CHECKPOINT_DOC = db.collection("ingestion_checkpoints").document("make_model")
RECALLS_COLLECTION = db.collection("recall_campaigns")


# -----------------------------
# Sanitization Helpers
# -----------------------------
def sanitize_make(make: str) -> str:
    """Remove characters that break NHTSA API and URL-encode."""
    cleaned = make.strip()
    cleaned = cleaned.replace("#", "")
    cleaned = cleaned.replace("&", "")
    cleaned = cleaned.replace("/", "")
    cleaned = cleaned.replace("  ", " ")
    return quote(cleaned)


def sanitize_model(model: str) -> str:
    """Remove characters that break NHTSA API and URL-encode."""
    cleaned = model.strip()
    cleaned = cleaned.replace("/", "")
    cleaned = cleaned.replace("&", "")
    cleaned = cleaned.replace("  ", " ")
    return quote(cleaned)


# -----------------------------
# Checkpoint Helpers
# -----------------------------
def load_checkpoint():
    doc = CHECKPOINT_DOC.get()
    if doc.exists:
        data = doc.to_dict()
        log_event(
            "Loaded checkpoint",
            event="checkpoint_loaded",
            last_make=data.get("last_make"),
            last_model=data.get("last_model"),
            last_year=data.get("last_year"),
        )
        return (
            data.get("last_make"),
            data.get("last_model"),
            data.get("last_year"),
        )

    log_event("No checkpoint found. Starting fresh.", event="checkpoint_missing")
    return (None, None, None)


def save_checkpoint(make, model, year):
    CHECKPOINT_DOC.set(
        {
            "last_make": make,
            "last_model": model,
            "last_year": year,
            "updated_at": datetime.datetime.utcnow(),
        }
    )
    log_event(
        "Checkpoint saved",
        event="checkpoint_saved",
        make=make,
        model=model,
        year=year,
    )


def reset_checkpoint():
    CHECKPOINT_DOC.delete()
    log_event(
        "Checkpoint reset. Full ingestion will start from the beginning.",
        event="checkpoint_reset",
    )


# -----------------------------
# REAL NHTSA API FUNCTIONS
# -----------------------------
def get_all_makes():
    """Fetch all vehicle makes from NHTSA API."""
    url = "https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json"
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()

    makes = [item["Make_Name"].upper() for item in data["Results"]]

    log_event("Fetched all makes", event="fetch_all_makes", count=len(makes))
    return makes


def get_models_for_make(make):
    """Fetch all models for a given make."""
    safe_make = sanitize_make(make)
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/{safe_make}?format=json"

    response = requests.get(url)
    response.raise_for_status()
    data = response.json()

    models = [item["Model_Name"].upper() for item in data["Results"]]

    log_event(
        "Fetched models for make",
        event="fetch_models",
        make=make,
        count=len(models),
    )
    return models


def fetch_and_store_recalls(make, model, year):
    """Fetch recalls for a make/model/year and store them in Firestore."""
    safe_make = sanitize_make(make)
    safe_model = sanitize_model(model)

    url = (
        f"https://api.nhtsa.gov/recalls/recallsByVehicle?"
        f"make={safe_make}&model={safe_model}&modelYear={year}"
    )

    response = requests.get(url)
    response.raise_for_status()
    data = response.json()

    recalls = data.get("results", [])

    for recall in recalls:
        recall_id = recall.get("NHTSACampaignNumber") or f"{make}-{model}-{year}-{time.time()}"
        RECALLS_COLLECTION.document(recall_id).set(recall)

    log_event(
        "Stored recalls",
        event="store_recalls",
        make=make,
        model=model,
        year=year,
        count=len(recalls),
    )


# -----------------------------
# Main Ingestion Logic
# -----------------------------
def run_ingestion(reset=False):
    if reset:
        reset_checkpoint()

    last_make, last_model, last_year = load_checkpoint()

    log_event("Starting ingestion run", event="ingestion_start")

    makes = get_all_makes()

    for make in makes:
        if last_make and make < last_make:
            continue

        models = get_models_for_make(make)

        for model in models:
            if last_make == make and last_model and model < last_model:
                continue

            for year in range(2000, 2025):
                if (
                    last_make == make
                    and last_model == model
                    and last_year is not None
                    and year <= last_year
                ):
                    continue

                start_time = time.time()

                log_event(
                    "Starting recall fetch",
                    event="start_fetch",
                    make=make,
                    model=model,
                    year=year,
                )

                try:
                    fetch_and_store_recalls(make, model, year)

                    duration_ms = int((time.time() - start_time) * 1000)

                    log_event(
                        "Recall fetch complete",
                        event="fetch_complete",
                        make=make,
                        model=model,
                        year=year,
                        duration_ms=duration_ms,
                    )

                    save_checkpoint(make, model, year)

                except Exception as e:
                    duration_ms = int((time.time() - start_time) * 1000)

                    log_event(
                        "Recall fetch failed",
                        event="fetch_failed",
                        make=make,
                        model=model,
                        year=year,
                        duration_ms=duration_ms,
                        error=str(e),
                    )

                    save_checkpoint(make, model, year)
                    raise e

    log_event("Ingestion complete. All makes/models/years processed.", event="ingestion_complete")


# -----------------------------
# CLI Entrypoint
# -----------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Make/Model Ingestion Job")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset checkpoint and start ingestion from the beginning",
    )
    args = parser.parse_args()

    run_ingestion(reset=args.reset)
