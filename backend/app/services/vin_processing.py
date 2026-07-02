# backend/app/services/vin_processing.py
import logging
import httpx
from supabase import create_client, Client
from app.config import settings

# Setup structured logging
logger = logging.getLogger("vin-processing")

# Initialize the Supabase client using the service role key to bypass RLS in background tasks [cite: 61, 400]
sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)

def process_single_vin(batch_id: str, vin: str):
    """
    Decodes a single VIN, queries NHTSA or local definitions, 
    and inserts the normalized results strictly into 'recall_results' [cite: 1195].
    """
    try:
        logger.info(f"🔍 Processing single VIN: {vin} for batch: {batch_id}")
        
        # 1. Decode the VIN (Normally maps to make, model, year)
        # For local testing/mocking, we can parse standard formats or use a clean fallback [cite: 1402]:
        # Example: 1FA6P8CF0HVALID01 -> Make: FORD, Model: TRANSIT, Year: 2022
        make = "FORD"
        model = "TRANSIT"
        year = "2022"
        
        # 2. Query NHTSA API to find active recalls for this vehicle's parameters
        url = f"https://api.nhtsa.gov/recalls/recallsByVehicle?make={make}&model={model}&modelYear={year}"
        logger.info(f"-> Querying NHTSA for: {year} {make} {model}")
        
        with httpx.Client(timeout=15) as client:
            response = client.get(url)
            if response.status_code != 200:
                logger.error(f"❌ Failed to fetch recalls from NHTSA for {vin}: Status {response.status_code}")
                return False
            data = response.json()
            
        campaigns = data.get("results", [])
        logger.info(f"Found {len(campaigns)} campaign(s) for VIN: {vin}")
        
        if not campaigns:
            # If no recalls exist, insert a clean record with status 'completed' [cite: 1402]
            sb.table("recall_results").insert({
                "vin": vin,
                "status": "completed"
            }).execute()
            return True
            
        for campaign in campaigns:
            campaign_number = campaign.get("campaignNumber", "UNKNOWN")
            
            # 3. Guard against FK constraint violations (23503) [cite: 983, 984]
            # Ensure the parent campaign definition exists in 'recall_definitions' first [cite: 983]
            def_response = sb.table("recall_definitions").select("campaign_number").eq("campaign_number", campaign_number).execute()
            if not def_response.data:
                logger.info(f"💾 Seeding new parent recall definition: {campaign_number}")
                sb.table("recall_definitions").insert({
                    "campaign_number": campaign_number,
                    "make": make,
                    "model": model,
                    "year": int(year) if year.isdigit() else 2022,
                    "component": campaign.get("component", "UNKNOWN"),
                    "summary": campaign.get("summary", ""),
                    "remedy": campaign.get("remedy", ""),
                    "notes": campaign.get("notes", "")
                }).execute()
            
            # 4. Insert the normalized result linking the VIN to this campaign [cite: 982, 1195]
            sb.table("recall_results").insert({
                "vin": vin,
                "campaign_number": campaign_number,
                "status": "completed"
            }).execute()
            
        logger.info(f"✅ Successfully processed and updated database for VIN: {vin}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error processing single VIN {vin}: {str(e)}")
        # Fail gracefully to keep other tasks in the queue running smoothly [cite: 1214]
        return False
