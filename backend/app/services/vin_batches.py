from datetime import datetime
from supabase import create_client, Client
from app.config import settings # <--- Add this

# Update this line
sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)


def create_vin_batch(vin_list: list, owner: str = None) -> str:
    """
    Creates a master batch record and bulk-inserts child VIN items into Supabase.
    """
    batch_id = f"batch_{uuid.uuid4().hex[:8]}"
    timestamp = datetime.utcnow().isoformat()

    try:
        # 1. Create parent batch record
        sb.table("vin_batches").insert({
            "id": batch_id,
            "created_at": timestamp,
            "updated_at": timestamp,
            "status": "pending",
            "total_vins": len(vin_list),
            "processed_vins": 0,
            "failed_vins": 0,
            "avg_processing_time_ms": 0,
            "owner": owner
        }).execute()

        # 2. Bulk insert VIN payloads in a single database round-trip
        vin_payloads = [
            {
                "batch_id": batch_id,
                "vin": vin,
                "status": "pending",
                "created_at": timestamp,
                "updated_at": timestamp
            }
            for vin in vin_list
        ]
        sb.table("vin_items").insert(vin_payloads).execute()

        return batch_id
    except Exception as e:
        print(f"❌ Error creating relational VIN batch: {str(e)}")
        raise


def update_vin_item(batch_id: str, vin: str, status: str, raw_data=None,
                    recalls=None, ai_summary=None, risk_score=None,
                    processing_time_ms=None, error_message=None):
    """
    Updates the execution metrics and state for a single child vehicle row.
    """
    try:
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }

        if raw_data is not None: update_data["raw_data"] = raw_data
        if recalls is not None: update_data["recalls"] = recalls
        if ai_summary is not None: update_data["ai_summary"] = ai_summary
        if risk_score is not None: update_data["risk_score"] = risk_score
        if processing_time_ms is not None: update_data["processing_time_ms"] = processing_time_ms
        if error_message is not None: update_data["error_message"] = error_message

        sb.table("vin_items") \
          .update(update_data) \
          .eq("batch_id", batch_id) \
          .eq("vin", vin) \
          .execute()
    except Exception as e:
        print(f"❌ Error updating single VIN record: {str(e)}")


def update_batch_progress(batch_id: str):
    """
    Leverages high-speed server-side aggregations to dynamically recalculate 
    parent metrics without pulling massive arrays into local memory.
    """
    try:
        timestamp = datetime.utcnow().isoformat()

        # 1. High-speed exact count lookups for child rows matching state parameters
        completed_query = sb.table("vin_items").select("vin", count="exact").eq("batch_id", batch_id).eq("status", "complete").execute()
        failed_query = sb.table("vin_items").select("vin", count="exact").eq("batch_id", batch_id).eq("status", "failed").execute()
        
        processed = completed_query.count if completed_query.count is not None else 0
        failed = failed_query.count if failed_query.count is not None else 0

        # 2. Query processing times for successful items to compute averages
        time_query = sb.table("vin_items").select("processing_time_ms").eq("batch_id", batch_id).not_.is_("processing_time_ms", "null").execute()
        time_records = time_query.data or []
        
        total_time = sum(r.get("processing_time_ms", 0) for r in time_records if r.get("processing_time_ms"))
        time_count = len([r for r in time_records if r.get("processing_time_ms")])
        avg_time = total_time / time_count if time_count > 0 else 0

        # 3. Fetch master blueprint metadata to update its progress status
        batch_query = sb.table("vin_batches").select("total_vins").eq("id", batch_id).execute()
        if not batch_query.data:
            print(f"⚠️ Batch reference target {batch_id} not found.")
            return
            
        total_vins = batch_query.data[0].get("total_vins", 0)

        # 4. Evaluate run progress state
        if processed + failed == 0:
            batch_status = "pending"
        elif processed + failed < total_vins:
            batch_status = "processing"
        else:
            batch_status = "complete"

        # 5. Push exact rolling numbers back to master record
        sb.table("vin_batches").update({
            "processed_vins": processed,
            "failed_vins": failed,
            "avg_processing_time_ms": avg_time,
            "status": batch_status,
            "updated_at": timestamp
        }).eq("id", batch_id).execute()

    except Exception as e:
        print(f"❌ Rollup aggregation execution error on batch progress update: {str(e)}")