from google.cloud import firestore
import requests
import time
import re
import sys
import ast

db = firestore.Client()

def sanitize_field(v, m=False):
    if v is None: 
        return 'UNKNOWN'
    s = str(v).strip()
    s = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', s)
    s = re.sub(r'\s+', ' ', s)
    if m and s in ['777', '999', '', 'NULL', 'None']: 
        return 'ALL_MODELS'
    return s.upper()

def safe_get(u):
    for a in range(3):
        try:
            r = requests.get(u, timeout=15)
            if r.status_code == 400: 
                return r
            r.raise_for_status()
            return r
        except: 
            time.sleep(2)
    return None

def process_task(tid, tdata):
    raw_make = tdata.get('make', '')
    raw_model = tdata.get('model', '')
    raw_year = tdata.get('year', '')
    
    if isinstance(raw_model, str) and raw_model.strip().startswith('{'):
        try: 
            raw_model = ast.literal_eval(raw_model)
        except: 
            pass
            
    if isinstance(raw_model, dict):
        raw_model = raw_model.get('model', '')
        
    make = sanitize_field(raw_make)
    model = sanitize_field(raw_model, m=True)
    year = sanitize_field(raw_year)
    
    if not make or not model or not year or model == 'ALL_MODELS':
        db.collection('recall_tasks').document(tid).update({'status': 'failed_format'})
        return False
        
    url = f'https://api.nhtsa.gov/recalls/recallsByVehicle?make={requests.utils.quote(make)}&model={requests.utils.quote(model)}&modelYear={year}'
    print(f'-> Fetching {tid} -> {url}')
    
    r = safe_get(url)
    if not r or r.status_code != 200:
        db.collection('recall_tasks').document(tid).update({'status': 'failed_api'})
        return False
        
    try: 
        data = r.json()
    except: 
        db.collection('recall_tasks').document(tid).update({'status': 'failed_json'})
        return False
        
    db.collection('recall_results').document(tid).set({
        'make': make, 
        'model': model, 
        'year': year, 
        'result': data, 
        'status': 'completed', 
        'timestamp': firestore.SERVER_TIMESTAMP
    })
    
    db.collection('recall_tasks').document(tid).update({'status': 'processed'})
    print(f'✓ Completed {tid}')
    return True

def run_worker(b=50):
    # Enforces explicit keyword argument compliance for newer google-cloud-firestore packages
    query = db.collection('recall_tasks').where(filter=firestore.FieldFilter('status', '==', 'pending'))
    
    # Corrected modern Firestore count aggregation extraction syntax
    count_docs = list(query.count().get())
    total = count_docs[0][0].value if count_docs else 0
    
    print(f'Queue Snapshot: {total} tasks remaining.')
    if total == 0: 
        return 0
        
    tasks = list(query.limit(b).stream())
    for t in tasks:
        db.collection('recall_tasks').document(t.id).update({'status': 'processing'})
        process_task(t.id, t.to_dict())
        time.sleep(0.5)
        
    return len(tasks)

if __name__ == '__main__':
    print('🚀 Ingestion Pipeline Started...')
    while True:
        try:
            if run_worker(50) == 0:
                print('🎉 SUCCESS: Pipeline empty!')
                break
        except Exception as e:
            print(f'Error: {e}. Retrying in 10s...')
            time.sleep(10)