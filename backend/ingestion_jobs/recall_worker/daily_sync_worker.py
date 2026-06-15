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

def calculate_materialized_telemetry(component: str, summary: str, consequence: str) -> dict:
    comp_upper = str(component).upper()
    text_corpus = (str(summary) + " " + str(consequence)).upper()
    
    if "ELECTRICAL" in comp_upper or "WIRING" in comp_upper or "MODULE" in comp_upper:
        category = "ELECTRICAL SYSTEM"
        base_severity = 65
    elif "BATTERY" in comp_upper or "CELL" in comp_upper or "CHARGER" in comp_upper:
        category = "ENERGY STORAGE / BATTERY"
        base_severity = 80
    elif "FUEL" in comp_upper or "TANK" in comp_upper or "LINE" in comp_upper or "RAIL" in comp_upper:
        category = "FUEL DELIVERY ARCHITECTURE"
        base_severity = 75
    elif "BRAKE" in comp_upper or "HYDRAULIC" in comp_upper or "CALIPER" in comp_upper:
        category = "DECELERATION CONTROL"
        base_severity = 85
    elif "STEERING" in comp_upper or "LINKAGE" in comp_upper:
        category = "DIRECTIONAL MATRIX"
        base_severity = 70
    else:
        category = "STRUCTURAL CHASSIS MOUNT"
        base_severity = 40

    thermal_keywords = ["HEAT", "FIRE", "MELT", "THERMAL", "CORROSION", "EXPANSION", "SHORT CIRCUIT", "DEGRADATION", "SHORT"]
    has_thermal_risk = any(kw in text_corpus for kw in thermal_keywords)
    
    severity_multiplier = 1.25 if has_thermal_risk else 1.00
    final_severity = min(100, int(base_severity * severity_multiplier))

    if final_severity >= 85:
        directive = "⚠️ CRITICAL HAZARD: Ground vehicle immediately. Structural or subassembly failure risk under current operational parameters."
    elif final_severity >= 65:
        if has_thermal_risk:
            directive = "☀️ REGIONAL WEATHER WARNING: High ambient localized thermal exposure risks compound component degradation. Reroute assets out of high-heat desert vectors."
        else:
            directive = "🔧 ADVANCED MAINTENANCE REQUIRED: Schedule component inspection and subassembly mitigation loop within 48 operational hours."
    else:
        directive = "📋 MONITOR CONDITION: Routine tracking active. Address update during next standard depot inspection layout interval."

    return {
        "assembly_category": category,
        "thermal_multiplier_active": has_thermal_risk,
        "calculated_severity_score": final_severity,
        "executive_action_directive": directive
    }

def process_task(task_id, task_data):
    raw_make = task_data.get('make', '')
    raw_model = task_data.get('model', '')
    raw_year = task_data.get('year', '')
    
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
    
    if not make or not model or not year:
        print(f"   ⚠️ Malformed document record layout encountered on token ID: {task_id}")
        db.collection(QUEUE_COLLECTION).document(task_id).update({
            'status': 'corrupted_format',
            'last_synchronized': firestore.SERVER_TIMESTAMP
        })
        return False
        
    url = f'https://api.nhtsa.gov/recalls/recallsByVehicle?make={requests.utils.quote(make)}&model={requests.utils.quote(model)}&modelYear={year}'
    
    response = safe_get(url)
    
    if not response or response.status_code != 200:
        status_code_log = response.status_code if response else "TIMEOUT_DISCONNECT"
        print(f"   ⚠️ Endpoint warning on token ID {task_id} (NHTSA Status Code: {status_code_log})")
        db.collection(QUEUE_COLLECTION).document(task_id).update({
            'status': 'invalid_nhtsa_target',
            'error_context': f"HTTP_ERR_{status_code_log}",
            'last_synchronized': firestore.SERVER_TIMESTAMP 
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
        
    # REFACTOR #1 IMPLEMENTATION: Isolate zero threat targets
    api_count = data.get("Count", 0)
    
    if api_count == 0:
        print(f"   ℹ️ Zero active threats found for {year} {make} {model}. Bypassing production cache write.")
        db.collection(PRODUCTION_TARGET_COLLECTION).document(task_id).delete()
    else:
        # REFACTOR #2 IMPLEMENTATION: Materialize scoring logic straight into document rows
        campaigns_list = data.get("results", [])
        processed_campaigns = []
        
        for camp in campaigns_list:
            comp = camp.get("Component", "UNKNOWN")
            summ = camp.get("Summary", "")
            cons = camp.get("Consequence", "")
            
            telemetry = calculate_materialized_telemetry(comp, summ, cons)
            
            notes_override = camp.get("Notes", "")
            if telemetry["thermal_multiplier_active"] and telemetry["calculated_severity_score"] >= 75:
                notes_override = f"⚠️ [REGIONAL WEATHER ALERT: CRITICAL HIGH] - Mojave / Sonoran thermal thresholds exceeded. {telemetry['executive_action_directive']}"
            
            processed_campaigns.append({
                "campaign_number": camp.get("CampaignNumber", "UNKNOWN"),
                "component": comp,
                "summary": summ,
                "consequence": cons,
                "remedy": camp.get("Remedy", ""),
                "notes": notes_override,
                "assembly_category": telemetry["assembly_category"],
                "thermal_multiplier_active": telemetry["thermal_multiplier_active"],
                "calculated_severity_score": telemetry["calculated_severity_score"],
                "executive_action_directive": telemetry["executive_action_directive"]
            })

        db.collection(PRODUCTION_TARGET_COLLECTION).document(task_id).set({
            'make': make, 
            'model': model, 
            'year': year, 
            'campaigns': processed_campaigns, 
            'status': 'completed', 
            'timestamp': firestore.SERVER_TIMESTAMP
        })
    
    db.collection(QUEUE_COLLECTION).document(task_id).update({
        'status': 'processed',
        'error_context': firestore.DELETE_FIELD, 
        'last_synchronized': firestore.SERVER_TIMESTAMP
    })
    print(f'   ✓ Consolidated synchronization matrix for: {year} {make} {model}')
    return True

def execute_batch_sync(batch_size=100):
    print("📡 Querying target sync indexes via status exclusion logic...")
    tasks_ref = db.collection(QUEUE_COLLECTION)
    
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
        time.sleep(0.20) 
        
    return processed_count

if __name__ == '__main__':
    print('==============================================================================')
    print('🚀 AEGIS SHIELD METRICS DELTA-TIME INGESTION ENGINE INITIALIZED')
    print('==============================================================================')
    
    start_time = time.time()
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
    print(f'🎉 SUCCESS: Materialized Ingestion Refactor Pass Complete.')
    print(f'🏁 Total Assets Processed: {total_processed} items | Duration: {duration}s')
    print('==============================================================================')
    sys.exit(0)