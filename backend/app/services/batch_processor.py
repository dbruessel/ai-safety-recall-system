# backend/app/services/batch_processor.py
import logging
from supabase import create_client, Client
from app.config import settings
from app.services.vin_processing import process_single_vin

# Setup structured logging
logger = logging.getLogger("batch-processor")

# Initialize the Supabase client using the service role key to bypass Row Level Security (RLS) in background tasks [cite: 61, 400]
sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)


def process_batch(batch_id: str):
    """
    Processes all VIN records associated with a specific batch ID from Supabase.
    Queries and updates the consolidated 'recall_results' table.
    """
    try:
        logger.info(f"🔄 Starting background processing for batch: {batch_id}")
        
        # 1. Fetch pending records from the consolidated recall_results table [cite: 67, 174]
        response = sb.table("recall_results").select("*").eq("status", "pending").execute()
        pending_records = response.data or []

        if not pending_records:
            logger.info(f"ℹ️ No pending VINs found to process for batch {batch_id}.")
            return

        logger.info(f"🚀 Processing {len(pending_records)} VINs for batch {batch_id}...")

        for record in pending_records:
            vin = record.get("vin")
            logger.info(f"→ Processing VIN: {vin}")
            
            try:
                # Execute the recall analysis logic for the individual VIN
                process_single_vin(batch_id=batch_id, vin=vin)
            except Exception as e:
                logger.error(f"   ❌ Error processing VIN {vin}: {e}")

            try:
                # 2. Update status from 'pending' to 'completed' directly in recall_results [cite: 655]
                sb.table("recall_results").update({"status": "completed"}).eq("vin", vin).execute()
                logger.info(f"   ✅ Marked VIN {vin} as completed.")
            except Exception as e:
                logger.warning(f"   ⚠️ Error updating status for VIN {vin} in database: {e}")

        logger.info(f"✅ Finished processing batch {batch_id}")
        
    except Exception as e:
        logger.error(f"❌ Batch Processor standard exception: {str(e)}")


def start_batch_processing(batch_id: str):
    """
    Relational background batch iteration handler triggered by the upload endpoint [cite: 1190].
    """
    try:
        logger.info(f"🔄 Triggering background execution task for batch: {batch_id}")
        
        # Route processing task to use the consolidated recall_results table
        process_batch(batch_id=batch_id)
        
        logger.info(f"🎉 Background processing execution complete for batch {batch_id}.")
        
    except Exception as e:
        logger.error(f"❌ Error during background processing execution: {str(e)}")