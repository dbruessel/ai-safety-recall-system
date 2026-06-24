from fastapi import APIRouter, HTTPException
from supabase import create_client, Client
from app.config import settings

router = APIRouter(tags=["vins"])

# Initialize production Supabase layer using Pydantic validated properties
sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)

@router.get("/vins/{vin}")
def get_vin_status(vin: str):
    """
    Retrieve single VIN execution statuses and historic recall results 
    directly from Supabase.
    """
    try:
        # Check tracking state inside your vin_items inventory
        response = sb.table("vin_items").select("*").eq("vin", vin.strip().upper()).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="VIN record not found in processed fleet historical indexes.")
            
        return {"vin": response.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error looking up VIN details: {str(e)}")
        raise HTTPException(status_code=500, detail="Database exception parsing target vehicle row attributes.")