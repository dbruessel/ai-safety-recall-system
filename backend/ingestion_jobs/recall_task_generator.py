from google.cloud import firestore
from datetime import datetime

db = firestore.Client()

MAKE_MODELS = "nhtsa_make_models"
TASKS = "recall_tasks"
CHECKPOINTS = "ingestion_checkpoints"

START_YEAR = 1990
END_YEAR = 2026


def generate_tasks(start_make_index=0):
    makes = [doc.id for doc in db.collection(MAKE_MODELS).stream()]
    total = len(makes)

    print(f"📦 Total makes: {total}")

    checkpoint_ref = db.collection(CHECKPOINTS).document("task_generator")

    for i in range(start_make_index, total):
        make = makes[i]
        doc = db.collection(MAKE_MODELS).document(make).get().to_dict() or {}
        models = doc.get("models", [])

        print(f"\n🧩 Generating tasks for make_index={i} → {make}")

        checkpoint_ref.set({
            "make_index": i,
            "make_name": make,
            "status": "running",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        })

        if not models:
            print(f"⚠️ No models for {make} — skipping.")
            checkpoint_ref.update({"status": "skipped"})
            continue

        for model in models:
            for year in range(START_YEAR, END_YEAR + 1):
                task_id = f"{make}_{model}_{year}"
                db.collection(TASKS).document(task_id).set({
                    "make": make,
                    "model": model,
                    "year": year,
                    "status": "pending",
                    "created_at": datetime.utcnow().isoformat() + "Z"
                })

        checkpoint_ref.update({
            "status": "completed",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        })

    print("\n🎉 Task generation complete!")


if __name__ == "__main__":
    cp = db.collection(CHECKPOINTS).document("task_generator").get().to_dict()
    start = cp["make_index"] + 1 if cp else 0
    generate_tasks(start_make_index=start)
