from google.cloud import firestore
from datetime import datetime
import uuid

db = firestore.Client()

def create_vin_batch(vin_list: list, owner: str = None):
    batch_id = f"batch_{uuid.uuid4().hex[:8]}"
    batch_ref = db.collection("vin_batches").document(batch_id)

    batch_data = {
        "created_at": datetime.utcnow(),
        "status": "pending",
        "total_vins": len(vin_list),
        "processed_vins": 0,
        "failed_vins": 0,
        "avg_processing_time_ms": 0,
        "owner": owner,
    }

    batch_ref.set(batch_data)

    # Create VIN subdocuments
    vin_items = batch_ref.collection("vin_items")
    for vin in vin_list:
        vin_items.document(vin).set({
            "vin": vin,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })

    return batch_id

def update_vin_item(batch_id: str, vin: str, status: str, raw_data=None,
                    recalls=None, ai_summary=None, risk_score=None,
                    processing_time_ms=None, error_message=None):

    vin_ref = db.collection("vin_batches").document(batch_id) \
                .collection("vin_items").document(vin)

    update_data = {
        "status": status,
        "updated_at": datetime.utcnow()
    }

    if raw_data is not None:
        update_data["raw_data"] = raw_data
    if recalls is not None:
        update_data["recalls"] = recalls
    if ai_summary is not None:
        update_data["ai_summary"] = ai_summary
    if risk_score is not None:
        update_data["risk_score"] = risk_score
    if processing_time_ms is not None:
        update_data["processing_time_ms"] = processing_time_ms
    if error_message is not None:
        update_data["error_message"] = error_message

    vin_ref.update(update_data)

def update_batch_progress(batch_id: str):
    """
    Aggregates VIN item statuses and updates the batch document.
    Computes:
      - processed_vins
      - failed_vins
      - avg_processing_time_ms
      - batch status (pending/processing/complete)
    """

    batch_ref = db.collection("vin_batches").document(batch_id)
    vin_items_ref = batch_ref.collection("vin_items")

    vin_docs = vin_items_ref.stream()

    processed = 0
    failed = 0
    total_time = 0
    time_count = 0

    for vin_doc in vin_docs:
        data = vin_doc.to_dict()
        status = data.get("status")

        if status == "complete":
            processed += 1
        elif status == "failed":
            failed += 1

        if data.get("processing_time_ms"):
            total_time += data["processing_time_ms"]
            time_count += 1

    avg_time = total_time / time_count if time_count > 0 else 0

    # Fetch total VIN count from batch
    batch_data = batch_ref.get().to_dict()
    total_vins = batch_data.get("total_vins", 0)

    # Determine batch status
    if processed + failed == 0:
        batch_status = "pending"
    elif processed + failed < total_vins:
        batch_status = "processing"
    else:
        batch_status = "complete"

    batch_ref.update({
        "processed_vins": processed,
        "failed_vins": failed,
        "avg_processing_time_ms": avg_time,
        "status": batch_status,
        "updated_at": datetime.utcnow()
    })
