from google.cloud import firestore
from app.services.vin_processing import process_single_vin
from app.services.vin_batches import update_batch_progress

db = firestore.Client()


def process_batch(batch_id: str):
    """
    Legacy batch processor (still works).
    """
    batch_ref = db.collection("vin_batches").document(batch_id)
    vin_items_ref = batch_ref.collection("vin_items")

    vin_docs = list(vin_items_ref.stream())

    if not vin_docs:
        print(f"No VINs found for batch {batch_id}")
        return

    print(f"Processing {len(vin_docs)} VINs for batch {batch_id}...")

    for doc in vin_docs:
        vin = doc.id
        print(f"→ Processing VIN: {vin}")
        try:
            process_single_vin(batch_id, vin)
        except Exception as e:
            print(f"   ❌ Error processing {vin}: {e}")

        try:
            update_batch_progress(batch_id)
        except Exception as e:
            print(f"   ⚠️ Error updating batch progress: {e}")

    print(f"✅ Finished processing batch {batch_id}")


def start_batch_processing(batch_id: str):
    """
    New batch processor used by the upload endpoint.
    Uses process_single_vin for consistency.
    """
    batch_ref = db.collection("vin_batches").document(batch_id)
    vin_items_ref = batch_ref.collection("vin_items")

    vin_docs = list(vin_items_ref.stream())

    for doc in vin_docs:
        vin = doc.id
        process_single_vin(batch_id=batch_id, vin=vin)

    # Mark batch complete
    batch_ref.update({
        "status": "complete"
    })
