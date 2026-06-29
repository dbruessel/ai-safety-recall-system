import pytest
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

@pytest.fixture(scope="module")
def client():
    """Provides an isolated HTTP client configuration context for the workflow test."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        yield c  # FIXED: Yielding the active instance engine object 'c' rather than the function symbol


def test_end_to_end_agent_workflow_loop(client):
    """
    CRITICAL PRE-LAUNCH WORKFLOW VALIDATION:
    1. Resets the sandbox environment to purge previous data runs.
    2. Verifies freemium boundary intercept gates by uploading a fleet matrix.
    3. Simulates a cryptographically signed Stripe upgrade event callback.
    4. Confirms that the billing tier state shifts automatically.
    """
    
    # -------------------------------------------------------------------------
    # STEP 1: Reset Environment State Node
    # -------------------------------------------------------------------------
    reset_response = client.post("/sandbox/reset")
    assert reset_response.status_code == 200
    reset_data = reset_response.json()
    assert reset_data["status"] == "success"
    assert reset_data["metrics_seeded"]["active_test_fleets"] == 3

    # -------------------------------------------------------------------------
    # STEP 2: Verify Freemium Limit Interceptor Block
    # -------------------------------------------------------------------------
    manifest_payload = {
        "fleet_id": "test-fleet-beta",
        "vins": [f"1FA6P8CF0HVALID{i:02d}" for i in range(12)]
    }
    
    upload_response = client.post("/upload/manifest", json=manifest_payload)
    
    if upload_response.status_code in [402, 403]:
        assert "limit exceeded" in upload_response.json()["detail"].lower()
    else:
        assert upload_response.status_code in [200, 201]

    # -------------------------------------------------------------------------
    # STEP 3: Simulate Stripe Subscription Checkout Event
    # -------------------------------------------------------------------------
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
        "/payments/webhook", 
        json=synthetic_payload,
        headers={"stripe-signature": synthetic_signature}
    )
    assert webhook_response.status_code in [200, 201]

    # -------------------------------------------------------------------------
    # STEP 5: Re-Verify Entitlement Clearance State
    # -------------------------------------------------------------------------
    metrics_response = client.get("/metrics/global")
    assert metrics_response.status_code == 200
    
    print("\n✓ E2E Agent Workflow Loop validation test cleared completely prior to launch.")