from app.services.vin_processing import process_single_vin

# Use the batch you just created
batch_id = "batch_af49bdf5"

# Pick one VIN from that batch
vin = "1HGCM82633A004352"

result = process_single_vin(batch_id, vin)

print("VIN processed!")
print(result)
