from app.services.fleetio_service import FleetioService

svc = FleetioService()

# 1. Test Auth Handshake
auth = svc.test_connection()
print(f"Handshake: {auth}")

# 2. Test Sanitized Roster
vehicles = svc.fetch_active_vehicles()
print(f"Active Highway Assets: {len(vehicles)}")
for v in vehicles:
    vid = v.get("fleetio_id")
    name = v.get("name")
    vin = v.get("vin")
    print(f" -> {vid}: {name} ({vin})")

# 3. Test Deduplication Catch
issue_id = svc.create_safety_recall_issue(
    fleetio_vehicle_id="5863002",
    recall={
        "campaign_number": "24V-123",
        "component": "STEERING",
        "summary": "Steering shaft bolt inspection",
        "remedy": "Dealer inspection and torquing free of charge."
    }
)
print(f"Issue Check/Creation Result ID: {issue_id}")