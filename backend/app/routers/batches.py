from fastapi import APIRouter, HTTPException
from google.cloud import firestore

router = APIRouter()
db = firestore.Client()

# -----------------------------
# GET /api/batches
# -----------------------------
@router.get("/batches")
def list_batches():
    """
    Return a list of all batches.
    """
    batches_ref = db.collection("vin_batches")
    docs = list(batches_ref.stream())

    batches = []
    for doc in docs:
        data = doc.to_dict() or {}
        data["batch_id"] = doc.id
        batches.append(data)

    return {"batches": batches}

@router.get("/batches/{batch_id}")
def get_batch(batch_id: str):
    """
    Return metadata for a single batch, including its VIN items.
    """
    batch_ref = db.collection("vin_batches").document(batch_id)
    batch_doc = batch_ref.get()

    if not batch_doc.exists:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Base batch metadata
    data = batch_doc.to_dict() or {}
    data["batch_id"] = batch_doc.id

    # Fetch VIN subcollection
    vin_items_ref = batch_ref.collection("vin_items")
    vin_docs = list(vin_items_ref.stream())

    vins = []
    for doc in vin_docs:
        vin_data = doc.to_dict() or {}
        vin_data["vin"] = doc.id
        vins.append(vin_data)

    # Attach VINs to batch
    data["vins"] = vins

    return {"batch": data}


# -----------------------------
# GET /api/batches/{batch_id}
# -----------------------------
@router.get("/batches/{batch_id}")
def get_batch(batch_id: str):
    """
    Return metadata for a single batch.
    """
    batch_ref = db.collection("vin_batches").document(batch_id)
    batch_doc = batch_ref.get()

    if not batch_doc.exists:
        raise HTTPException(status_code=404, detail="Batch not found")

    data = batch_doc.to_dict() or {}
    data["batch_id"] = batch_doc.id

    return {"batch": data}


# -----------------------------
# GET /api/batches/{batch_id}/vins
# -----------------------------
@router.get("/batches/{batch_id}/vins")
def list_batch_vins(batch_id: str):
    """
    Return all VIN items inside a batch.
    """
    batch_ref = db.collection("vin_batches").document(batch_id)
    if not batch_ref.get().exists:
        raise HTTPException(status_code=404, detail="Batch not found")

    vin_items_ref = batch_ref.collection("vin_items")
    vin_docs = list(vin_items_ref.stream())

    vins = []
    for doc in vin_docs:
        data = doc.to_dict() or {}
        data["vin"] = doc.id
        vins.append(data)

    return {"vins": vins}
