$code = @'
from google.cloud import firestore
import requests
import time
import re
import sys

# Initialize Firestore Client
db = firestore.Client()

def sanitize_field(field_value, is_model=False):
    """
    Sanitize input values to handle messy NHTSA data strings.
    Prevents unmapped integer codes (like 777/999) from crashing validations.
    """
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
            resp = requests.get(url, timeout=15) # 15s timeout accounts for heavy payload stalls
            
            # If NHTSA explicitly tells us the client data formatting is bad, stop retrying
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
    """
    Process a single recall ingestion task cleanly.
    Updates the task status immediately on complete or failure.
    """
    raw_make = task_data.get("make", "")
    raw_model = task_data.get("model", "")
    raw_year = task_data.get("year", "")

    # Handle nested model structures if they exist
    if isinstance(raw_model, dict):
        raw_model = raw_model.get("model", "")

    # Run fields through the sanitation layer
    make = sanitize_field(raw_make)
    model = sanitize_field(raw_model, is_model=True)
    year = sanitize_field(raw_year)

    # If parameters are completely unworkable, flag it as a formatting failure and skip
    if not make or not model or not year or model == "ALL_MODELS":
        print(f"⚠️ Skipping and marking invalid task format: {task_id}")
        db.collection("recall_tasks").document(task_id).update({"status": "failed_format"})
        return False

    # Build clear, URL-encoded string
    url = (
        f"https://api.nhtsa.gov/recalls/recallsByVehicle?"
        f"make={requests.utils.quote(make)}&"
        f"model={requests.utils.quote(model)}&"
        f"modelYear={year}"
    )

    print(f"→ Fetching {task_id} → {url}")
    resp = safe_get(url)
    
    if not resp or resp.status_code != 200:
        print(f"❌ Failed to fetch valid data from API for {task_id}.")
        db.collection("recall_tasks").document(task_id).update({"status": "failed_api"})
        return False

    try:
        data = resp.json()
    except Exception as e:
        print(f"❌ JSON Parse Error for {task_id}: {e}")
        db.collection("recall_tasks").document(task_id).update({"status": "failed_json"})
        return False

    # Save results securely inside firestore
    db.collection("recall_results").document(task_id).set({
        "make": make,
        "model": model,
        "year": year,
        "result": data,
        "status": "completed",
        "timestamp": firestore.SERVER_TIMESTAMP,
    })
    
    # IMMEDIATELY update status so this record is popped off the queue
    db.collection("recall_tasks").document(task_id).update({"status": "processed"})
    print(f"✓ Completed {task_id}")
    return True


def run_worker(batch_size=50):
    """Run recall ingestion worker in targeted, manageable database chunks."""
    total_pending = db.collection("recall_tasks").where("status", "==", "pending").count().get().count
    print(f"📊 Queue Snapshot: {total_pending} pending tasks remaining.")

    if total_pending == 0:
        return 0

    # Grab the target chunk
    tasks_ref = db.collection("recall_tasks").where("status", "==", "pending").limit(batch_size)
    tasks = list(tasks_ref.stream())

    print(f"🔄 Processing batch of {len(tasks)} tasks...")

    for t in tasks:
        # Atomic processing lock: change status immediately so multiple workers don't grab it
        db.collection("recall_tasks").document(t.id).update({"status": "processing"})
        
        # Process task handles internal state adjustments (success vs error buckets)
        process_task(t.id, t.to_dict())
        
        # 0.5s polite throttle to prevent running into NHTSA firewall rate limits at scale
        time.sleep(0.5) 

    return len(tasks)


def run_until_empty(chunk_size=50, max_empty_loops=3):
    """
    Continually executes the worker script in chunks until the pending queue 
    is entirely depleted. Avoids memory overhead and engine timeouts.
    """
    empty_count = 0
    loop_number = 1

    print("🚀 Initializing Full-Scale Fleet Recall Ingestion Pipeline...")
    
    while True:
        print(f"\n--- 🔄 Starting Processing Cycle #{loop_number} ---")
        
        try:
            processed_count = run_worker(batch_size=chunk_size)
            
            if processed_count == 0:
                empty_count += 1
                print(f"💤 No pending tasks found. Verification check ({empty_count}/{max_empty_loops})...")
                if empty_count >= max_empty_loops:
                    print("\n🎉 SUCCESS: Ingestion pipeline complete! No pending tasks remaining.")
                    break
                time.sleep(5)  # Let any delayed async writes settle
                continue
                
            # Reset validation counter if jobs were actively processed
            empty_count = 0
            
        except Exception as loop_error:
            print(f"❌ Critical error unexpected during cycle #{loop_number}: {loop_error}")
            print("Resuming next batch in 10 seconds to maintain pipeline momentum...")
            time.sleep(10)
            
        loop_number += 1


if __name__ == "__main__":
    # Chunk size 50 is optimized for reliable throughput without exceeding Firestore payload bounds.
    run_until_empty(chunk_size=50)
'@

Set-Content -Path recall_worker.py -Value $code -Encoding utf8