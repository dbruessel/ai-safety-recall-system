from app.services.vin_batches import create_vin_batch

vin_list = [
    "1HGCM82633A004352",
    "JHMFA16586S000123",
    "5YJSA1E26HF000987"
]

batch_id = create_vin_batch(vin_list, owner="Dennis")

print(f"Created batch: {batch_id}")
