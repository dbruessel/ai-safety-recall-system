import os
import json
import time
from typing import Any, Dict, List, Optional

import requests
from google.cloud import firestore
import logging
import sys
import traceback


# -----------------------------
# Logging helper (UPDATED)
# -----------------------------

def log_event(message: str, **kwargs):
    """Safe JSON logging that handles Firestore timestamps and other non-serializable types."""

    def safe_json(obj):
        if hasattr(obj, "isoformat"):
            return obj.isoformat()
        if isinstance(obj, dict):
            return {k: safe_json(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [safe_json(v) for v in obj]
        return obj

    payload = {"message": message, **kwargs}

    try:
        print(json.dumps(safe_json(payload), ensure_ascii=False))
    except Exception as e:
        print(f"Logging error: {e} | Raw payload: {payload}")


# -----------------------------
# Config
# -----------------------------

PROJECT_ID = os.getenv("GCP_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")
CHECKPOINT_COLLECTION = "ingestion_checkpoints"
CHECKPOINT_DOC_ID = "make_model"

NHTSA_VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles"
NHTSA_RECALL_BASE = "https://api.nhtsa.gov/recalls/recallsByVehicle"

START_YEAR = 2000
END_YEAR = 2026


# -----------------------------
# Firestore helpers
# -----------------------------

def get_db() -> firestore.Client:
    if not PROJECT_ID:
        raise RuntimeError("GCP_PROJECT or GOOGLE_CLOUD_PROJECT is not set")
    return firestore.Client(project=PROJECT_ID)


def load_checkpoint(db: firestore.Client) -> Dict[str, Any]:
    doc_ref = db.collection(CHECKPOINT_COLLECTION).document(CHECKPOINT_DOC_ID)
    doc = doc_ref.get()

    if doc.exists:
        data = doc.to_dict() or {}
        log_event("Loaded checkpoint", event="checkpoint_loaded", checkpoint=data)
        return data

    checkpoint = {
        "make_index": 0,
        "model_index": 0,
        "year": START_YEAR,
        "completed": False,
    }
    log_event("No checkpoint found, starting fresh", event="checkpoint_new", checkpoint=checkpoint)
    return checkpoint


def save_checkpoint(db, make_index, model_index, year, completed=False):
    doc_ref = db.collection(CHECKPOINT_COLLECTION).document(CHECKPOINT_DOC_ID)
    checkpoint = {
        "make_index": make_index,
        "model_index": model_index,
        "year": year,
        "completed": completed,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    doc_ref.set(checkpoint)
    log_event("Checkpoint saved", event="checkpoint_saved", checkpoint=checkpoint)


def reset_checkpoint(db):
    save_checkpoint(db, 0, 0, START_YEAR, completed=False)
    log_event("Checkpoint reset", event="checkpoint_reset")


# -----------------------------
# HTTP helpers
# -----------------------------

def fetch_with_retry(url: str, retries=3, delay=2.0, timeout=15) -> Optional[requests.Response]:
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, timeout=timeout)
            if r.status_code == 200 and r.text.strip():
                return r

            log_event("Non-200 or empty response",
                      event="http_error",
                      url=url,
                      status_code=r.status_code,
                      attempt=attempt)

        except Exception as e:
            log_event("Request failed",
                      event="request_exception",
                      url=url,
                      error=str(e),
                      attempt=attempt)

        time.sleep(delay)

    log_event("Max retries reached", event="retry_exhausted", url=url)
    return None


def safe_json_parse(response: requests.Response) -> Optional[Dict[str, Any]]:
    try:
        if response.status_code != 200:
            log_event("Non-200 in safe_json_parse",
                      event="json_http_error",
                      status_code=response.status_code)
            return None

        if not response.text.strip():
            log_event("Empty body in safe_json_parse", event="json_empty_body")
            return None

        return response.json()

    except json.JSONDecodeError as e:
        log_event("JSON decode failed",
                  event="json_decode_error",
                  error=str(e),
                  body_preview=response.text[:200])
        return None


# -----------------------------
# NHTSA helpers
# -----------------------------

def fetch_all_makes():
    url = f"{NHTSA_VPIC_BASE}/getallmakes?format=json"
    log_event("Fetching all makes", event="fetch_all_makes", url=url)

    resp = fetch_with_retry(url)
    if not resp:
        log_event("Failed to fetch makes", event="fetch_all_makes_failed")
        return []

    data = safe_json_parse(resp)
    if not data:
        log_event("No data for makes", event="fetch_all_makes_no_data")
        return []

    results = data.get("Results", [])
    log_event("Fetched makes", event="fetch_all_makes_success", count=len(results))
    return results


def fetch_models_for_make_id(make_id: int):
    url = f"{NHTSA_VPIC_BASE}/GetModelsForMakeId/{make_id}?format=json"
    log_event("Fetching models", event="fetch_models", url=url, make_id=make_id)

    resp = fetch_with_retry(url)
    if not resp:
        log_event("Failed to fetch models", event="fetch_models_failed", make_id=make_id)
        return []

    data = safe_json_parse(resp)
    if not data:
        log_event("No data for models", event="fetch_models_no_data", make_id=make_id)
        return []

    results = data.get("Results", [])
    log_event("Fetched models", event="fetch_models_success", make_id=make_id, count=len(results))
    return results


def fetch_recalls_for_vehicle(make: str, model: str, year: int):
    url = f"{NHTSA_RECALL_BASE}?make={make}&model={model}&modelYear={year}"
    log_event("Fetching recalls",
              event="fetch_recalls",
              url=url,
              make=make,
              model=model,
              year=year)

    resp = fetch_with_retry(url)
    if not resp:
        log_event("Failed to fetch recalls",
                  event="fetch_recalls_failed",
                  make=make,
                  model=model,
                  year=year)
        return []

    data = safe_json_parse(resp)
    if not data:
        log_event("No data for recalls",
                  event="fetch_recalls_no_data",
                  make=make,
                  model=model,
                  year=year)
        return []

    results = data.get("results") or data.get("Results") or []
    log_event("Fetched recalls",
              event="fetch_recalls_success",
              make=make,
              model=model,
              year=year,
              count=len(results))
    return results


# -----------------------------
# Firestore write
# -----------------------------

def store_recall(db, recall, make, model, year):
    recalls_col = db.collection("recalls")
    doc = {
        "make": make,
        "model": model,
        "year": year,
        "raw": recall,
        "created_at": firestore.SERVER_TIMESTAMP,
    }
    recalls_col.add(doc)


# -----------------------------
# Main ingestion loop
# -----------------------------

def run_ingestion(reset=False):
    db = get_db()

    if reset:
        reset_checkpoint(db)

    checkpoint = load_checkpoint(db)
    make_index = checkpoint.get("make_index", 0)
    model_index = checkpoint.get("model_index", 0)
    year = checkpoint.get("year", START_YEAR)
    completed = checkpoint.get("completed", False)

    if completed:
        log_event("Checkpoint indicates completed run; exiting", event="already_completed")
        return

    makes = fetch_all_makes()
    if not makes:
        log_event("No makes available; exiting", event="no_makes")
        return

    log_event("Starting ingestion run",
              event="ingestion_start",
              total_makes=len(makes),
              start_make_index=make_index,
              start_model_index=model_index,
              start_year=year)

    try:
        for mi in range(make_index, len(makes)):
            make_obj = makes[mi]
            make_name = (make_obj.get("Make_Name") or "").strip()
            make_id = make_obj.get("Make_ID")

            if not make_name or make_id is None:
                log_event("Skipping make with missing data",
                          event="skip_make_invalid",
                          make_index=mi,
                          make_obj=make_obj)
                continue

            log_event("Processing make",
                      event="process_make",
                      make_index=mi,
                      make_name=make_name,
                      make_id=make_id)

            models = fetch_models_for_make_id(make_id)
            if not models:
                save_checkpoint(db, mi + 1, 0, START_YEAR)
                continue

            # ---------------------------------------------------
            # NEW: Update make/model reference data in Firestore
            # ---------------------------------------------------
            model_names = [
                (m.get("Model_Name") or "").strip()
                for m in models
                if m.get("Model_Name")
            ]

            db.collection("nhtsa_make_models").document(make_name).set({
                "models": model_names,
                "updated_at": firestore.SERVER_TIMESTAMP
            }, merge=True)

            log_event("Updated make/model reference",
                      event="update_make_models",
                      make=make_name,
                      count=len(model_names))
            # ---------------------------------------------------

            start_model_idx = model_index if mi == make_index else 0
            start_year_for_make = year if mi == make_index else START_YEAR

            for mj in range(start_model_idx, len(models)):
                model_obj = models[mj]
                model_name = (model_obj.get("Model_Name") or "").strip()

                if not model_name:
                    log_event("Skipping model with missing name",
                              event="skip_model_invalid",
                              make_name=make_name,
                              model_index=mj)
                    continue

                log_event("Processing model",
                          event="process_model",
                          make_name=make_name,
                          model_name=model_name,
                          model_index=mj)

                start_year_for_model = start_year_for_make if mj == start_model_idx else START_YEAR

                for yr in range(start_year_for_model, END_YEAR + 1):
                    try:
                        recalls = fetch_recalls_for_vehicle(make_name, model_name, yr)
                        if not recalls:
                            continue

                        for rec in recalls:
                            try:
                                store_recall(db, rec, make_name, model_name, yr)
                            except Exception as e:
                                log_event("Failed to store recall",
                                          event="store_recall_error",
                                          make=make_name,
                                          model=model_name,
                                          year=yr,
                                          error=str(e))
                                continue

                        log_event("Stored recalls for vehicle",
                                  event="store_recalls_success",
                                  make=make_name,
                                  model=model_name,
                                  year=yr,
                                  count=len(recalls))

                    except Exception as e:
                        log_event("Recall fetch failed for vehicle",
                                  event="recall_fetch_exception",
                                  make=make_name,
                                  model=model_name,
                                  year=yr,
                                  error=str(e))
                        continue

                    save_checkpoint(db, mi, mj, yr)

                start_year_for_make = START_YEAR

            model_index = 0
            year = START_YEAR
            save_checkpoint(db, mi + 1, 0, START_YEAR)

        save_checkpoint(db, len(makes), 0, END_YEAR, completed=True)
        log_event("Ingestion completed successfully", event="ingestion_completed")

    except Exception as e:
        log_event("Fatal error caught at top level", event="fatal_error", error=str(e))


# -----------------------------
# SAFE ENTRYPOINT FOR CONTAINER STARTUP
# -----------------------------

def safe_start():
    """Guaranteed-safe startup wrapper so Cloud Run can start the container."""
    print("Container started — safe_start() executing")

    print(f"Python executable: {sys.executable}")
    print(f"Python version: {sys.version}")

    try:
        print("Starting ingestion engine...")
        run_ingestion(reset="--reset" in sys.argv)
        print("Ingestion engine completed successfully")

    except Exception as e:
        print(f"Fatal error in ingestion: {e}")
        traceback.print_exc()
        sys.exit(1)

    print("Job finished — exiting cleanly")


def main():
    safe_start()


if __name__ == "__main__":
    main()
