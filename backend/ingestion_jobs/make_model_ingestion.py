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

        # Merge any structured fields
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


# -----------------------------
# Checkpoint Helpers
# -----------------------------
def load_checkpoint():
    """Load last processed make/model/year from Firestore."""
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
    """Save progress to Firestore."""
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
    """Delete checkpoint document."""
    CHECKPOINT_DOC.delete()
    log_event(
        "Checkpoint reset. Full ingestion will start from the beginning.",
        event="checkpoint_reset",
    )


# -----------------------------
# Mocked External Functions
# Replace these with your actual ingestion logic
# -----------------------------
def get_all_makes():
    """Return list of makes from NHTSA."""
    # Replace with your real function
    return ["FORD", "HONDA", "TOYOTA"]


def get_models_for_make(make):
    """Return list of models for a given make."""
    # Replace with your real function
    if make == "FORD":
        return ["F-150", "F-250"]
    if make == "HONDA":
        return ["CIVIC", "ACCORD"]
    if make == "TOYOTA":
        return ["CAMRY", "COROLLA"]
    return []


def fetch_and_store_recalls(make, model, year):
    """Fetch recalls for a make/model/year and store them in Firestore."""
    # Replace with your real ingestion logic
    log_event(
        "Fetching recalls",
        event="fetch_recalls",
        make=make,
        model=model,
        year=year,
    )
    # Simulate work
    time.sleep(0.05)
    # Simulate Firestore write here
    return True


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
        # Skip until we reach the checkpoint make
        if last_make and make < last_make:
            continue

        models = get_models_for_make(make)

        for model in models:
            # Skip until we reach the checkpoint model (for the same make)
            if last_make == make and last_model and model < last_model:
                continue

            for year in range(2000, 2025):
                # Skip years up to and including the checkpoint year
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

                    # Save checkpoint before exiting so we can resume
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
