import csv
import io
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from supabase import create_client, Client
from app.config import settings
from app.services.batch_processor import start_batch_processing

router = APIRouter(tags=["upload"])

# Initialize Supabase client
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
        
        # Explicitly grab the first item in the list and strip it
        vin = str(row).strip()
        
        if vin:
            vins.append(vin)

    return vins

@router.post("/batches/upload")
async def upload_vins(file: UploadFile = File(...)):
    """
    Upload a CSV of VINs, enforce freemium limits, and bulk-insert
    directly into the consolidated recall_results table.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    file_bytes = await file.read()
    vins = parse_csv(file_bytes)

    if not vins:
        raise HTTPException(status_code=400, detail="No VINs found in file")

    # 1. Freemium Paywall Interceptor: Enforce the 10-VIN limit for the API backend
    if len(vins) > 10:
        raise HTTPException(
            status_code=402, 
            detail="Payment Required: Freemium limit exceeded. Please upgrade to Pro."
        )

    batch_id = str(uuid.uuid4())

    try:
        # 2. Target the active consolidated relational table directly
        vin_payloads = [
            {
                "vin": vin,
                "status": "pending"
            }
            for vin in vins
        ]

        # 3. Bulk insert completely avoiding the legacy tables
        sb.table("recall_results").insert(vin_payloads).execute()

        # 🔥 Auto-trigger processing
        start_batch_processing(batch_id)

        return {
            "batch_id": batch_id,
            "vin_count": len(vins),
            "message": "Upload successful and processing started"
        }

    except Exception as e:
        print(f"❌ Upload Ingestion Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database write failure compiling manifest.")