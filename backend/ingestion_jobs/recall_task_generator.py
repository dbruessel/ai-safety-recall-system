from google.cloud import firestore

db = firestore.Client()

YEARS = list(range(2000, 2025))

def run():
    makes_ref = db.collection("nhtsa_make_models").stream()

    batch = db.batch()
    count = 0

    for doc in makes_ref:
        make = doc.id
        models = doc.to_dict().get("models", [])

        for model in models:
            for year in YEARS:
                task_ref = db.collection("recall_tasks").document()
                batch.set(task_ref, {
                    "make": make,
                    "model": model,
                    "year": year,
                    "status": "pending"
                })
                count += 1

                if count % 400 == 0:
                    batch.commit()
                    batch = db.batch()

    batch.commit()
    print(f"Generated {count} recall tasks")

if __name__ == "__main__":
    run()
