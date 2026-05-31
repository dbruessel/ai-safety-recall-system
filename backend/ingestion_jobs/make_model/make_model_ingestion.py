import requests
from google.cloud import firestore
from datetime import datetime
import time

db = firestore.Client()

CHECKPOINTS = "ingestion_checkpoints"
MAKE_MODELS = "nhtsa_make_models"


def safe_get(url, timeout=15, retries=5, backoff=1.5):
    for attempt in range(retries):
        try:
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp
        except (requests.Timeout, requests.ConnectionError) as e:
            wait = backoff ** attempt
            print(f"[WARN] {type(e).__name__} on {url}. Retrying in {wait:.1f}s…")
            time.sleep(wait)
    raise Exception(f"Failed after {retries} retries: {url}")


def sanitize(text):
    return (
        text.replace("/", " ")
            .replace("\\", " ")
            .replace("#", "")
            .replace("  ", " ")
            .strip()
    )


def run_make_model_ingestion(start_index=0):
    print("\n🚗 Fetching all makes from VPIC…")

    makes_url = "https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json"
    resp = safe_get(makes_url)
    makes_raw = resp.json().get("Results", [])

    makes = [sanitize(m["Make_Name"]).upper() for m in makes_raw if m.get("Make_Name")]
    total = len(makes)

    print(f"📦 Total makes found: {total}")

    checkpoint_ref = db.collection(CHECKPOINTS).document("make_model")

    for i in range(start_index, total):
        make = makes[i]
        print(f"\n🔧 Processing make_index={i} → {make}")

        checkpoint_ref.set({
            "make_index": i,
            "make_name": make,
            "status": "running",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        })

        url = f"https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/{make}?format=json"
        resp = safe_get(url)
        models_raw = resp.json().get("Results", [])

        models = sorted(list(set(
            sanitize(m["Model_Name"])
            for m in models_raw
            if m.get("Model_Name")
        )))

        db.collection(MAKE_MODELS).document(make).set({
            "models": models,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        })

        print(f"✅ Saved {len(models)} models for {make}")

        checkpoint_ref.update({
            "status": "completed",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        })

        time.sleep(0.3)

    print("\n🎉 Make/model ingestion complete!")


if __name__ == "__main__":
    cp = db.collection(CHECKPOINTS).document("make_model").get().to_dict()
    start = cp["make_index"] + 1 if cp else 0
    run_make_model_ingestion(start_index=start)
