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

def fetch_recalls(make, model, year):
    url = (
        "https://api.nhtsa.gov/recalls/recallsByVehicle"
        f"?make={make}&model={model}&modelYear={year}"
    )
    r = safe_get(url)
    r.raise_for_status()
    return r.json().get("results", [])

def normalize(raw):
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

def run(task_index, task_count):
    tasks = list(db.collection("recall_tasks").stream())
    slice_size = len(tasks) // task_count
    start = task_index * slice_size
    end = start + slice_size if task_index < task_count - 1 else len(tasks)

    my_tasks = tasks[start:end]

    for t in my_tasks:
        data = t.to_dict()
        make = data["make"]
        model = data["model"]
        year = data["year"]

        recalls = fetch_recalls(make, model, year)

        batch = db.batch()
        for raw in recalls:
            campaign = normalize(raw)
            doc_id = campaign["campaign_number"]
            ref = db.collection("recall_campaigns").document(doc_id)
            batch.set(ref, campaign, merge=True)

        batch.commit()

        t.reference.update({"status": "done"})

if __name__ == "__main__":
    import os
    run(
        task_index=int(os.environ["CLOUD_RUN_TASK_INDEX"]),
        task_count=int(os.environ["CLOUD_RUN_TASK_COUNT"])
    )
