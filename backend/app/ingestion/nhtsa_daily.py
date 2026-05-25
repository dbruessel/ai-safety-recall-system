import time
import requests
from google.cloud import firestore
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

db = firestore.Client()

# ---------------------------------------------------------
# LOGGING HELPERS
# ---------------------------------------------------------
def log(level, message):
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{level}] {timestamp} — {message}")


# ---------------------------------------------------------
# GLOBAL RATE LIMITING (SAFE MODE)
# ---------------------------------------------------------
_rate_lock = Lock()
_last_request_time = 0.0
MIN_INTERVAL_SECONDS = 0.3  # ~3.3 requests/second total


def _rate_limited_request(url):
    global _last_request_time
    with _rate_lock:
        now = time.time()
        elapsed = now - _last_request_time
        wait = MIN_INTERVAL_SECONDS - elapsed
        if wait > 0:
            time.sleep(wait)
        _last_request_time = time.time()
        return requests.get(url, timeout=10)


# ---------------------------------------------------------
# SAFE REQUEST WRAPPER (RETRY + RATE LIMIT)
# ---------------------------------------------------------
def safe_get(url, retries=5, backoff=1.5):
    for attempt in range(retries):
        try:
            return _rate_limited_request(url)
        except requests.exceptions.ConnectionError:
            wait = backoff ** attempt
            log("WARN", f"Connection reset. Retrying in {wait:.1f}s...")
            time.sleep(wait)
    raise Exception(f"Failed after {retries} retries: {url}")


# ---------------------------------------------------------
# FETCH ALL MODELS FOR A MAKE (WITH FIRESTORE CACHE)
# ---------------------------------------------------------
def get_models_for_make(make):
    cache_ref = db.collection("nhtsa_make_models").document(make)
    cache_doc = cache_ref.get()

    if cache_doc.exists:
        data = cache_doc.to_dict()
        models = data.get("models", [])
        log("INFO", f"Using cached {len(models)} models for {make}")
        return models

    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/{make}?format=json"
    response = safe_get(url)
    response.raise_for_status()
    data = response.json()
    models = [m["Model_Name"] for m in data.get("Results", [])]

    log("INFO", f"Fetched {len(models)} models for {make} from VPIC")

    cache_ref.set(
        {
            "models": models,
            "updated_at": datetime.utcnow(),
        },
        merge=True,
    )

    return models


# ---------------------------------------------------------
# FETCH RECALLS FOR MAKE + MODEL + YEAR
# ---------------------------------------------------------
def fetch_recalls(make, model, year):
    url = (
        "https://api.nhtsa.gov/recalls/recallsByVehicle"
        f"?make={make}&model={model}&modelYear={year}"
    )
    response = safe_get(url)
    response.raise_for_status()
    return response.json().get("results", [])


# ---------------------------------------------------------
# NORMALIZE RECALL DATA TO FIRESTORE SCHEMA
# ---------------------------------------------------------
def normalize_campaign(raw):
    return {
        "campaign_number": raw.get("CampaignNumber"),
        "make": raw.get("Make"),
        "model": raw.get("Model"),
        "year": int(raw["ModelYear"]) if raw.get("ModelYear") else None,
        "component": raw.get("Component"),
        "summary": raw.get("Summary"),
        "consequence": raw.get("Consequence"),
        "remedy": raw.get("Remedy"),
        "notes": raw.get("Notes"),
        "population": int(raw["PotentialUnitsAffected"]) if raw.get("PotentialUnitsAffected") else None,
        "manufacturer": raw.get("Manufacturer"),
        "report_date": raw.get("ReportReceivedDate"),
        "recall_initiated_date": raw.get("RecallInitiatedDate"),
        "nhtsa_url": f"https://www.nhtsa.gov/recalls?nhtsaId={raw.get('CampaignNumber')}",
        "updated_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }


# ---------------------------------------------------------
# UPSERT INTO FIRESTORE WITH DELTA INGESTION
# ---------------------------------------------------------
def upsert_campaign(campaign):
    doc_id = campaign["campaign_number"]
    doc_ref = db.collection("recall_campaigns").document(doc_id)

    existing = doc_ref.get()

    if existing.exists:
        existing_data = existing.to_dict()

        ignore = ["created_at", "updated_at"]
        existing_clean = {k: v for k, v in existing_data.items() if k not in ignore}
        incoming_clean = {k: v for k, v in campaign.items() if k not in ignore}

        if existing_clean == incoming_clean:
            return False  # no write needed

        campaign["created_at"] = existing_data.get("created_at")

    doc_ref.set(campaign, merge=True)
    return True  # write occurred


# ---------------------------------------------------------
# WORKER FOR PARALLEL INGESTION
# ---------------------------------------------------------
def process_triplet(make, model, year):
    fetched = 0
    inserted = 0
    skipped = 0

    try:
        log("INFO", f"Fetching recalls for {make} {model} {year}...")
        raw_campaigns = fetch_recalls(make, model, year)
        fetched = len(raw_campaigns)
        log("INFO", f" → {fetched} recalls found for {make} {model} {year}")

        for raw in raw_campaigns:
            campaign = normalize_campaign(raw)
            if upsert_campaign(campaign):
                inserted += 1
            else:
                skipped += 1

    except requests.HTTPError as e:
        log("ERROR", f"HTTP error for {make} {model} {year}: {e}")
    except Exception as e:
        log("ERROR", f"Fatal error for {make} {model} {year}: {e}")

    return fetched, inserted, skipped


# ---------------------------------------------------------
# MAIN INGESTION LOOP (PARALLEL, SAFE, LOGGED)
# ---------------------------------------------------------
def run_ingestion():
    log("INFO", "Starting NHTSA ingestion job")

    makes = ["FORD", "TOYOTA", "HONDA"]
    years = range(2000, 2025)

    total_fetched = 0
    total_inserted = 0
    total_skipped = 0

    tasks = []

    # Build all tasks first
    for make in makes:
        log("INFO", f"Preparing models for {make}...")
        models = get_models_for_make(make)
        for model in models:
            for year in years:
                tasks.append((make, model, year))

    log("INFO", f"Total tasks to process: {len(tasks)}")

    # Parallel execution with safe concurrency
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_task = {
            executor.submit(process_triplet, make, model, year): (make, model, year)
            for (make, model, year) in tasks
        }

        for future in as_completed(future_to_task):
            fetched, inserted, skipped = future.result()
            total_fetched += fetched
            total_inserted += inserted
            total_skipped += skipped

    log(
        "INFO",
        f"Ingestion complete. Fetched: {total_fetched}, Inserted: {total_inserted}, Skipped: {total_skipped}",
    )


# ---------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------
if __name__ == "__main__":
    run_ingestion()
