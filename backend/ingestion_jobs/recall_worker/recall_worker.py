from google.cloud import firestore
import requests
import time

db = firestore.Client()

def safe_get(url):
    """Perform a safe GET request with retry logic."""
    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            return resp
        except requests.exceptions.RequestException as e:
            print(f"Attempt {attempt + 1} failed for {url}: {e}")
            time.sleep(2)
    return None


def process_task(task_id, task_data):
    """Process a single recall ingestion task."""
    make = str(task_data.get("make", "")).strip()
    model = task_data.get("model", "")
    year = str(task_data.get("year", "")).strip()

    # Handle nested model dictionaries
    if isinstance(model, dict):
        model = str(model.get("model", "")).strip()
    else:
        model = str(model).strip()

    # Skip invalid entries
    if not make or not model or not year:
        print(f"⚠️ Skipping invalid task: {task_id}")
        return

    # Build clean URL
    url = (
        f"https://api.nhtsa.gov/recalls/recallsByVehicle?"
        f"make={requests.utils.quote(make)}&"
        f"model={requests.utils.quote(model)}&"
        f"modelYear={year}"
    )

    print(f"→ Fetching {task_id} → {url}")

    resp = safe_get(url)
    if not resp:
        print(f"❌ Failed to fetch data for {task_id}")
        return

    data = resp.json()
    db.collection("recall_results").document(task_id).set({
        "make": make,
        "model": model,
        "year": year,
        "result": data,
        "status": "completed",
        "timestamp": firestore.SERVER_TIMESTAMP,
    })

    print(f"✓ Completed {task_id}")


def run_worker(batch_size=10):
    """Run recall ingestion worker in batches with progress metrics."""
    total_pending = db.collection("recall_tasks").where("status", "==", "pending").count().get().count
    total_processed = db.collection("recall_tasks").where("status", "==", "processed").count().get().count
    total = total_pending + total_processed

    print(f"📊 Progress: {total_processed} processed / {total} total")

    tasks_ref = db.collection("recall_tasks").where("status", "==", "pending").limit(batch_size)
    tasks = list(tasks_ref.stream())

    if not tasks:
        print("✅ No pending tasks found.")
        return

    print(f"🔄 Processing {len(tasks)} tasks...")

    for t in tasks:
        print(f"→ Starting task {t.id}")
        process_task(t.id, t.to_dict())
        db.collection("recall_tasks").document(t.id).update({"status": "processed"})
        print(f"✓ Finished task {t.id}")

    remaining = db.collection("recall_tasks").where("status", "==", "pending").count().get().count
    print(f"⏳ Remaining tasks: {remaining}")


if __name__ == "__main__":
    run_worker(batch_size=10)
