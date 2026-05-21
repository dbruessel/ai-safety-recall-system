from fastapi import APIRouter, HTTPException
from google.cloud import firestore

router = APIRouter()
db = firestore.Client()


@router.get("/vins/{vin_id}")
def get_vin_detail(vin_id: str):
    """
    Return full VIN intelligence for a single VIN.
    Searches across all batches.
    """
    batches_ref = db.collection("vin_batches")
    batch_docs = list(batches_ref.stream())

    # Search for VIN across all batches
    for batch_doc in batch_docs:
        vin_ref = batch_doc.reference.collection("vin_items").document(vin_id)
        vin_doc = vin_ref.get()

        if vin_doc.exists:
            data = vin_doc.to_dict() or {}
            data["vin"] = vin_id
            data["batch_id"] = batch_doc.id
            return {"vin": data}

    raise HTTPException(status_code=404, detail="VIN not found")
