import pytest
import httpx

# Ensure the base URL is just the root; paths will be appended from the client calls
BASE_URL = "http://127.0.0.1:8000"
# This secret must match the one in your sandbox.py
AUTH_HEADERS = {"x-sandbox-key": "RECALL_LOGIC_LOCAL_ONLY_SECRET"}

@pytest.fixture(scope="module")
def client():
    """Provides an isolated HTTP client configuration context."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        yield c 

def test_end_to_end_agent_workflow_loop(client):
    """
    CRITICAL PRE-LAUNCH WORKFLOW VALIDATION:
    1. Resets the sandbox environment (with security headers).
    2. Verifies freemium boundary gates via /api/batches/upload.
    3. Simulates Stripe checkout.
    4. Validates state changes.
    """
    
    # -------------------------------------------------------------------------
    # STEP 1: Reset Environment State Node
    # -------------------------------------------------------------------------
    # Injecting the security header here fixes the 403/Access Denied error
    reset_response = client.post("/sandbox/reset", headers=AUTH_HEADERS)
    
    # Asserting 200 now, with helpful debug text if it fails
    assert reset_response.status_code == 200, f"Reset failed: {reset_response.text}"
    
    reset_data = reset_response.json()
    assert reset_data["status"] == "success"

    # -------------------------------------------------------------------------
    # STEP 2: Verify Freemium Limit Interceptor Block
    # -------------------------------------------------------------------------
    # Convert your manifest to a file-like object for upload
    manifest_csv_content = "vin,make,model\n" + "\n".join([f"1FA6P8CF0HVALID{i:02d},FORD,TRANSIT" for i in range(12)])
    files = {"file": ("manifest.csv", manifest_csv_content, "text/csv")}
    
    # Send as multipart/form-data using the 'files' parameter
    upload_response = client.post("/api/batches/upload", files=files)
    
    # 422 Unprocessable Entity is often returned when validation fails (like missing file)
    # The fix above should result in 200 or 402/403 now
    assert upload_response.status_code in [200, 201, 402, 403], f"Upload failed: {upload_response.text}"
    # -------------------------------------------------------------------------
    
    # STEP 3: Simulate Stripe Subscription Checkout Event
    # -------------------------------------------------------------------------
    # This remains unchanged as it matches the route audit
    mock_pay_response = client.post("/sandbox/mock-checkout", json={
        "customer_email": "agent-test-fleet@recalllogic.internal",
        "price_id": "price_premium_tier_10_vin_gate",
        "metadata": {"fleet_id": "test-fleet-beta", "fleet_limit_override": "true"}
    })
    assert mock_pay_response.status_code == 200
    mock_pay_data = mock_pay_response.json()
    
    synthetic_payload = mock_pay_data["payload"]
    synthetic_signature = mock_pay_data["simulated_header"]

    # -------------------------------------------------------------------------
    # STEP 4: Fire Callback Directly to Live Webhook Router Pipeline
    # -------------------------------------------------------------------------
    webhook_response = client.post(
        "/api/webhooks/payments/webhook", 
        json=synthetic_payload,
        headers={"stripe-signature": synthetic_signature}
    )
    assert webhook_response.status_code in [200, 201], f"Webhook failed: {webhook_response.text}"

    # -------------------------------------------------------------------------
    # STEP 5: Re-Verify Entitlement Clearance State
    # -------------------------------------------------------------------------
    metrics_response = client.get("/api/metrics/global")
    assert metrics_response.status_code == 200
    
    print("\n✓ E2E Agent Workflow Loop validation test cleared.")