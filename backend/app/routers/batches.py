import os
from fastapi import APIRouter, HTTPException
from supabase import create_client, Client
from app.config import settings # <--- Add this

router = APIRouter(tags=["batches"])

# Update this line
sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)

# -----------------------------
# GET /api/batches
# -----------------------------
@router.get("/batches")
def list_batches():
    """
    Return a list of all processing batches stored in Supabase.
    """
    try:
        response = sb.table("vin_batches").select("*").execute()
        return {"batches": response.data}
    except Exception as e:
        print(f"❌ Error fetching batches: {str(e)}")
        raise HTTPException(status_code=500, detail="Error querying batch storage layer.")


# -----------------------------
# GET /api/batches/{batch_id}
# -----------------------------
@router.get("/batches/{batch_id}")
def get_batch(batch_id: str):
    """
    Return metadata for a single batch, including its nested VIN items 
    retrieved via an explicit relational filter query.
    """
    try:
        # 1. Fetch the master batch data row
        batch_response = sb.table("vin_batches").select("*").eq("id", batch_id).execute()
        
        if not batch_response.data:
            raise HTTPException(status_code=404, detail="Batch not found")
            
        batch_data = batch_response.data[0]

        # 2. Query the associated children entries using relational constraints
        vin_response = sb.table("vin_items").select("*").eq("batch_id", batch_id).execute()
        
        # Structure the payload to perfectly preserve what the frontend expects
        batch_data["vins"] = vin_response.data

        return {"batch": batch_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching single batch details: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server loop exception fetching batch indexes.")


# -----------------------------
# GET /api/batches/{batch_id}/vins
# -----------------------------
@router.get("/batches/{batch_id}/vins")
def list_batch_vins(batch_id: str):
    """
    Return all VIN items tightly coupled to this specific batch_id.
    """
    try:
        # Check if the parent batch row exists first
        batch_check = sb.table("vin_batches").select("id").eq("id", batch_id).execute()
        if not batch_check.data:
            raise HTTPException(status_code=404, detail="Batch asset not found")

        # Fetch all child entries matching the criteria
        vin_response = sb.table("vin_items").select("*").eq("batch_id", batch_id).execute()
        return {"vins": vin_response.data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error listing batch VIN arrays: {str(e)}")
        raise HTTPException(status_code=500, detail="Pipeline fault parsing child node entries.")