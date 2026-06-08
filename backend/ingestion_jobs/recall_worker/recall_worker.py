import time
from datetime import datetime

import requests
from google.api_core import retry
from google.cloud import firestore

# Import the shared normalization logic
from app.normalization.normalization import normalize_campaign

db = firestore.Client()

TASKS = "recall_tasks"
RECALLS = "recall_campaigns"
CHECKPOINTS = "ingestion_checkpoints"


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
    print(f"[ERROR] Exhausted retries for {url}")
    return None


def upsert(campaign: dict) -> bool:
    cid = campaign.get("campaign_number")
    if not cid:
        return False

    ref = db.collection(RECALLS).document(cid)
    existing = ref.get()

    if existing.exists:
        old = existing.to_dict()
        ignore = ["created_at", "updated_at"]

        old_filtered = {k: v for k, v in old.items() if k not in ignore}
        new_filtered = {k: v for k, v in campaign.items() if k not in ignore}

        # Skip write if nothing changed
        if old_filtered == new_filtered:
            return False

        # Preserve original created_at
        campaign["created_at"] = old.get("created_at")

    ref.set(campaign, merge=True)
    return True


def update_checkpoint(task_id: str, make: str, model: str, year: int, status: str):
    cp = db.collection(CHECKPOINTS).document("worker")
    cp.set(
        {
            "task_id": task_id,
            "make": make,
            "model": model,
            "year": year,
            "status": status,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        },
        merge=True,
    )


def process_task(task_id: str, task: dict):
    make = task["make"]
    model = task["model"]
    year = task["year"]

    print(f"\n🔧 Processing {task_id} ({make} {model} {year})")

    update_checkpoint(task_id, make, model, year, "running")

    url = (
        "https://api.nhtsa.gov/recalls/recallsByVehicle"
        f"?make={make}&model={model}&modelYear={year}"
    )

    resp = safe_get(url)
    if not resp:
        print(f"[ERROR] Failed to fetch {task_id}")
        db.collection(TASKS).document(task_id).update({"status": "error"})
        update_checkpoint(task_id, make, model, year, "error")
        return

    data = resp.json()
    recalls = data.get("results", []) or data.get("Results", [])

    for raw in recalls:
        campaign = normalize_campaign(raw, make, model, year)
        upsert(campaign)

    db.collection(TASKS).document(task_id).update(
        {
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat() + "Z",
        }
    )

    update_checkpoint(task_id, make, model, year, "completed")


@retry.Retry(deadline=300)
def safe_stream(query):
    # Wrap Firestore stream in retry to handle transient UNAVAILABLE errors
    return list(query.stream())


def run_worker(batch_size: int = 10):
    tasks = safe_stream(
        db.collection(TASKS)
        .where("status", "==", "pending")
        .limit(batch_size)
    )

    if not tasks:
        print("✅ No pending tasks.")
        return

    print(f"📦 Processing {len(tasks)} tasks…")

    for t in tasks:
        process_task(t.id, t.to_dict())
        time.sleep(0.2)

    print("\n🎉 Worker batch complete.")


if __name__ == "__main__":
    run_worker(batch_size=10)
