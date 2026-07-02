from app.services.batch_processor import process_batch

batch_id = "batch_af49bdf5"   # <-- your real batch ID
process_batch(batch_id)

print("Batch processing complete.")
