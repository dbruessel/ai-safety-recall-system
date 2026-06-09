from google.cloud import firestore
import requests
import time
import re

db = firestore.Client()

def sanitize_field(field_value, is_model=False):
    """Sanitize input values to handle messy NHTSA data strings."""
    if field_value is None:
        return "UNKNOWN"
        
    # Standardize string formatting
    val_str = str(field_value).strip()
    
    # Clean up hidden control characters, tabs, and excess whitespace
    val_str = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', val_str)
    val_str = re.sub(r'\s+', ' ', val_str)
    
    # Specific NHTSA fallback handling
    if is_model and val_str in ['777', '999', '', 'NULL', 'None']:
        return "ALL_MODELS"
        
    return val_str.upper()


def safe_get(url):
    """Perform a safe GET request with retry logic and explicit error handling."""
    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=15) # Increased timeout slightly for large payloads
            
            # If NHTSA explicitly tells us the client data is bad, don't keep retrying
            if resp.status_code == 400:
                print(f"❌ Bad Request (400) for URL: {url}")
                return resp
                
            resp.raise_for_status()
            return resp
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Attempt {attempt + 1} failed for {url}: {e}")
            time.sleep(2)
    return None


def process_task(task_id, task_data):
    """Process a single recall ingestion task cleanly."""
    raw_make = task_data.get("make", "")
    raw_model = task_data.get("model", "")
    raw_year = task_data.get("year", "")

    # Handle nested model structures if they exist
    if isinstance(raw_model, dict):
        raw_model = raw_model.get("model", "")

    # Run everything through the sanitation layer
    make = sanitize_field(raw_make)
    model = sanitize_field(raw_model, is_model=True)
    year = sanitize_field(raw_year)

    # If it's still fundamentally missing, flag it as a formatting failure
    if not make or not model or not year or model == "ALL_MODELS":
        print(f"⚠️ Skipping and marking invalid task: {task_id}")
        db.collection("recall_tasks").document(task_id).update({"status": "failed_format"})
        return False

    url = (
        f"https://api.nhtsa.gov/recalls/recallsByVehicle?"
        f"make={requests.utils.quote(make)}&"
        f"model={requests.utils.quote(model)}&"
        f"modelYear={year}"
    )

    print(f"→ Fetching {task_id} → {url}")
    resp = safe_get(url)
    
    if not resp or resp.status_code != 200:
        print(f"❌ Failed to fetch valid data for {task_id}. Moving to failed queue.")
        db.collection("recall_tasks").document(task_id).update({"status": "failed_api"})
        return False

    try:
        data = resp.json()
    except Exception as e:
        print(f"❌ JSON Parse Error for {task_id}: {e}")
        db.collection("recall_tasks").document(task_id).update({"status": "failed_json"})
        return False

    # Save results securely
    db.collection("recall_results").document(task_id).set({
        "make": make,
        "model": model,
        "year": year,
        "result": data,
        "status": "completed",
        "timestamp": firestore.SERVER_TIMESTAMP,
    })
    
    # IMMEDIATELY update status so this record is never pulled again
    db.collection("recall_tasks").document(task_id).update({"status": "processed"})
    print(f"✓ Completed {task_id}")
    return True


def run_worker(batch_size=50):
    """Run recall ingestion worker continually in safe chunks."""
    # Quick high-level count metrics
    total_pending = db.collection("recall_tasks").where("status", "==", "pending").count().get().count
    print(f"📊 Starting run. Total pending tasks in queue: {total_pending}")

    if total_pending == 0:
        print("✅ No pending tasks found.")
        return

    # Grab the target chunk
    tasks_ref = db.collection("recall_tasks").where("status", "==", "pending").limit(batch_size)
    tasks = list(tasks_ref.stream())

    print(f"🔄 Processing batch of {len(tasks)} tasks...")

    for t in tasks:
        # Optimistic lock: change status to processing immediately so simultaneous workers won't touch it
        db.collection("recall_tasks").document(t.id).update({"status": "processing"})
        
        # Process task handles its own success/fail state updates internally
        process_task(t.id, t.to_dict())
        
        # Politeness throttle to avoid hitting NHTSA's rate limit walls
        time.sleep(0.5) 

    remaining = db.collection("recall_tasks").where("status", "==", "pending").count().get().count
    print(f"⏳ Batch finished. Remaining pending tasks: {remaining}")


if __name__ == "__main__":
    # Bumped batch size up safely now that inline task resolution is secure.
    # You can loop this via bash or a while True loop to empty the pipeline completely!
    run_worker(batch_size=50)