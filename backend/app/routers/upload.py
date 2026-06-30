import csv
import io
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from supabase import create_client, Client
from app.config import settings # <--- Add this
from app.services.batch_processor import start_batch_processing

router = APIRouter(tags=["upload"])

# Update this line
sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)


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
    Upload a CSV of VINs, create a relational parent batch row, 
    bulk-insert the child VIN entries, and trigger background processing.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    file_bytes = await file.read()
    vins = parse_csv(file_bytes)

    if not vins:
        raise HTTPException(status_code=400, detail="No VINs found in file")

    batch_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()

    try:
        # 1. Create parent batch record
        sb.table("vin_batches").insert({
            "id": batch_id,
            "created_at": timestamp,
            "total_vins": len(vins),
            "processed_vins": 0,
            "status": "processing"
        }).execute()

        # 2. Prepare child entries for lightning-fast relational bulk insertion
        vin_payloads = [
            {
                "batch_id": batch_id,
                "vin": vin,
                "status": "pending",
                "created_at": timestamp
            }
            for vin in vins
        ]

        # Bulk insert completely avoids heavy row-by-row loops over the network link
        sb.table("vin_items").insert(vin_payloads).execute()

        # 🔥 Auto-trigger processing
        start_batch_processing(batch_id)

        return {
            "batch_id": batch_id,
            "vin_count": len(vins),
            "message": "Batch created and processing started"
        }

    except Exception as e:
        print(f"❌ Upload Ingestion Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database write failure compiling manifest.")