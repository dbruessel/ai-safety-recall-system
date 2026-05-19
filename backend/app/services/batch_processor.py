from app.services.vin_processing import process_single_vin
from app.services.vin_batches import update_batch_progress

from google.cloud import firestore

db = firestore.Client()

def process_batch(batch_id: str):
    """
    Process all VINs in a batch sequentially.
    For each VIN:
      - run the full VIN pipeline
      - update batch progress
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

        # Recompute batch progress after each VIN
        try:
            update_batch_progress(batch_id)
        except Exception as e:
            print(f"   ⚠️ Error updating batch progress: {e}")

    print(f"✅ Finished processing batch {batch_id}")
