import time
import requests
from google.cloud import firestore
from datetime import datetime

db = firestore.Client()
session = requests.Session()

def safe_get(url, retries=5):
    for i in range(retries):
        try:
            return session.get(url, timeout=10)
        except Exception:
            time.sleep(1.5 ** i)
    raise Exception(f"Failed GET: {url}")

def get_all_makes():
    url = "https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json"
    r = safe_get(url)
    r.raise_for_status()
    data = r.json()
    return [m["Make_Name"] for m in data.get("Results", [])]

def get_models(make):
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/{make}?format=json"
    r = safe_get(url)
    r.raise_for_status()
    data = r.json()
    return [m["Model_Name"] for m in data.get("Results", [])]

def run():
    makes = get_all_makes()
    for make in makes:
        models = get_models(make)
        db.collection("nhtsa_make_models").document(make).set({
            "models": models,
            "updated_at": datetime.utcnow()
        })
        print(f"Stored {len(models)} models for {make}")

if __name__ == "__main__":
    run()
