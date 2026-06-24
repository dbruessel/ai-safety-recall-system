# backend/app/services/batch_processor.py
from supabase import create_client, Client
from app.config import settings # <--- Add this import
from app.services.vin_processing import process_single_vin
from app.services.vin_batches import update_batch_progress

# Update these initialization lines to use your validated settings object
sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)


def process_batch(batch_id: str):
    """
    Processes all VIN records associated with a specific batch ID from Supabase.
    """
    try:
        # Fetch child rows linked to the parent batch
        response = sb.table("vin_items").select("vin").eq("batch_id", batch_id).execute()
        vin_items = response.data

        if not vin_items:
            print(f"No VINs found for batch {batch_id}")
            return

        print(f"Processing {len(vin_items)} VINs for batch {batch_id}...")

        for item in vin_items:
            vin = item["vin"]
            print(f"→ Processing VIN: {vin}")
            try:
                process_single_vin(batch_id, vin)
            except Exception as e:
                print(f"   ❌ Error processing {vin}: {e}")

            try:
                update_batch_progress(batch_id)
            except Exception as e:
                print(f"   ⚠️ Error updating batch progress: {e}")

        print(f"✅ Finished processing batch {batch_id}")
        
    except Exception as e:
        print(f"❌ Batch Processor standard exception: {str(e)}")


def start_batch_processing(batch_id: str):
    """
    Relational background batch iteration handler triggered by the upload endpoint.
    """
    try:
        # Pull down target records matching the foreign key constraint
        response = sb.table("vin_items").select("vin").eq("batch_id", batch_id).execute()
        vin_items = response.data

        for item in vin_items:
            vin = item["vin"]
            process_single_vin(batch_id=batch_id, vin=vin)

        # Mark parent record state as complete in the relational table
        sb.table("vin_batches").update({"status": "complete"}).eq("id", batch_id).execute()
        print(f"🎉 Batch {batch_id} marked complete in database.")
        
    except Exception as e:
        print(f"❌ Error during background processing execution: {str(e)}")