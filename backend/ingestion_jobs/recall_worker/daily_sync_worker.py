# backend/ingestion_jobs/recall_worker/daily_sync_worker.py
import sys
import time
import re
import ast
import requests
from google.cloud import firestore

# Initialize Firestore Client Engine Context
db = firestore.Client()

# System Infrastructure Target Namespaces
QUEUE_COLLECTION = "recall_tasks"
PRODUCTION_TARGET_COLLECTION = "recalls_normalized"

def sanitize_field(v, m=False):
    if v is None: 
        return 'UNKNOWN'
    s = str(v).strip()
    s = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', s) # Purge hidden byte streams
    s = re.sub(r'\s+', ' ', s)
    if m and s in ['777', '999', '', 'NULL', 'NONE']: 
        return 'ALL_MODELS'
    return s.upper()

def safe_get(url):
    for attempt in range(3):
        try:
            response = requests.get(url, timeout=15)
            if response.status_code == 400 or response.status_code == 404: 
                return response
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException:
            time.sleep(2)
    return None

def process_task(task_id, task_data):
    raw_make = task_data.get('make', '')
    raw_model = task_data.get('model', '')
    raw_year = task_data.get('year', '')
    
    # Process stringified dictionary array variations safely
    if isinstance(raw_model, str) and raw_model.strip().startswith('{'):
        try: 
            raw_model = ast.literal_eval(raw_model)
        except Exception: 
            pass
            
    if isinstance(raw_model, list) and len(raw_model) > 0:
        raw_model = raw_model[0]

    if isinstance(raw_model, dict):
        raw_model = raw_model.get('model', raw_model.get('value', ''))
        
    make = sanitize_field(raw_make)
    model = sanitize_field(raw_model, m=True)
    year = sanitize_field(raw_year)
    
    # Circuit Breaker Trace 1: Bad Internal Formatting Check
    if not make or not model or not year:
        print(f"   ⚠️ Malformed document record layout encountered on token ID: {task_id}")
        db.collection(QUEUE_COLLECTION).document(task_id).update({
            'status': 'corrupted_format',
            'last_synchronized': firestore.SERVER_TIMESTAMP
        })
        return False
        
    url = f'https://api.nhtsa.gov/recalls/recallsByVehicle?make={requests.utils.quote(make)}&model={requests.utils.quote(model)}&modelYear={year}'
    
    response = safe_get(url)
    
    # Circuit Breaker Trace 2: Handling API drops, bad query limits, or 404 targets gracefully
    if not response or response.status_code != 200:
        status_code_log = response.status_code if response else "TIMEOUT_DISCONNECT"
        print(f"   ⚠️ Endpoint warning on token ID {task_id} (NHTSA Status Code: {status_code_log})")
        db.collection(QUEUE_COLLECTION).document(task_id).update({
            'status': 'invalid_nhtsa_target',
            'error_context': f"HTTP_ERR_{status_code_log}",
            'last_synchronized': firestore.SERVER_TIMESTAMP # Moves it chronologically backward
        })
        return False
        
    try: 
        data = response.json()
    except Exception: 
        db.collection(QUEUE_COLLECTION).document(task_id).update({
            'status': 'corrupted_json_payload',
            'last_synchronized': firestore.SERVER_TIMESTAMP
        })
        return False
        
    # Standard Case Path: Hydrate production recalls data storage layers natively
    db.collection(PRODUCTION_TARGET_COLLECTION).document(task_id).set({
        'make': make, 
        'model': model, 
        'year': year, 
        'result': data, 
        'status': 'completed', 
        'timestamp': firestore.SERVER_TIMESTAMP
    })
    
    # Secure state manifest markers
    db.collection(QUEUE_COLLECTION).document(task_id).update({
        'status': 'processed',
        'error_context': firestore.DELETE_FIELD, # Wipe old validation error markers if fixed
        'last_synchronized': firestore.SERVER_TIMESTAMP
    })
    print(f'   ✓ Consolidated synchronization matrix for: {year} {make} {model}')
    return True

def execute_batch_sync(batch_size=100):
    print("📡 Querying target sync indexes via status exclusion logic...")
    tasks_ref = db.collection(QUEUE_COLLECTION)
    
    # STATUS EXCLUSION UPDATE: Filter out rows that have already been evaluated 
    # or flagged with terminal conditions, clearing out un-synchronized entities cleanly.
    query = (tasks_ref
             .where(filter=firestore.FieldFilter('status', 'not-in', ['processed', 'invalid_nhtsa_target', 'corrupted_format', 'processing']))
             .limit(batch_size))
        
    tasks = list(query.stream())
    if not tasks:
        print("ℹ️ No outstanding tasks found awaiting status-exclusion loops.")
        return 0
        
    processed_count = 0
    for t in tasks:
        db.collection(QUEUE_COLLECTION).document(t.id).update({'status': 'processing'})
        process_task(t.id, t.to_dict())
        processed_count += 1
        time.sleep(0.20) # Throttle cleanly to satisfy live API connection limits
        
    return processed_count

if __name__ == '__main__':
    print('==============================================================================')
    print('🚀 AEGIS SHIELD METRICS DELTA-TIME INGESTION ENGINE INITIALIZED')
    print('==============================================================================')
    
    start_time = time.time()
    
    # Processing block ceiling limit per invocation pass to ensure safety limits
    MAX_RUN_QUOTA = 500
    total_processed = 0
    
    try:
        while total_processed < MAX_RUN_QUOTA:
            batch_count = execute_batch_sync(100)
            if batch_count == 0:
                break
            total_processed += batch_count
            print(f"⚡ Batch milestone complete: {total_processed}/{MAX_RUN_QUOTA} rows evaluated...")
            
    except Exception as global_err:
        print(f"❌ Global runtime pipeline intercept exception dropped: {str(global_err)}")
        sys.exit(1)
        
    duration = round(time.time() - start_time, 2)
    print('==============================================================================')
    print(f'🎉 SUCCESS: Status-Exclusion Delta-Time Sync Pass Complete.')
    print(f'🏁 Total Assets Processed: {total_processed} items | Duration: {duration}s')
    print('==============================================================================')
    sys.exit(0)