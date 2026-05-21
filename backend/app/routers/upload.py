from fastapi import APIRouter, UploadFile, File, HTTPException
from google.cloud import firestore
import csv
import io
import uuid
from datetime import datetime
from app.services.batch_processor import start_batch_processing

router = APIRouter()
db = firestore.Client()


def parse_csv(file_bytes: bytes):
    """
    Parse a CSV file and extract VINs.
    Assumes VINs are in the first column.
    """
    text = file_bytes.decode("utf-8")
    reader = csv.reader(io.StringIO(text))

    vins = []
    for row in reader:
        if not row:
            continue
        vin = row[0].strip()
        if vin:
            vins.append(vin)

    return vins


@router.post("/batches/upload")
async def upload_vins(file: UploadFile = File(...)):
    """
    Upload a CSV of VINs, create a batch, store VIN items,
    and automatically trigger batch processing.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    file_bytes = await file.read()
    vins = parse_csv(file_bytes)

    if not vins:
        raise HTTPException(status_code=400, detail="No VINs found in file")

    # Create batch
    batch_id = str(uuid.uuid4())
    batch_ref = db.collection("vin_batches").document(batch_id)

    batch_ref.set({
        "batch_id": batch_id,
        "created_at": datetime.utcnow().isoformat(),
        "total_vins": len(vins),
        "processed_vins": 0,
        "status": "processing",
    })

    # Add VIN items
    for vin in vins:
        vin_ref = batch_ref.collection("vin_items").document(vin)
        vin_ref.set({
            "vin": vin,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
        })

    # 🔥 Auto-trigger processing
    start_batch_processing(batch_id)

    return {
        "batch_id": batch_id,
        "vin_count": len(vins),
        "message": "Batch created and processing started"
    }
