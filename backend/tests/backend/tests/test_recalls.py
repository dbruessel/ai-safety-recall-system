import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.routers.recalls import calculate_safety_telemetry

client = TestClient(app)

# ==============================================================================
# 🧠 TRACK 1: CORE UNIT TESTS (ALGORITHM MATRIX VERIFICATION)
# ==============================================================================

def test_calculate_safety_telemetry_electrical_with_heat():
    """Verify that electrical assemblies subject to heat trigger the 1.25 climate modifier penalty."""
    telemetry = calculate_safety_telemetry(
        component="ELECTRICAL SYSTEM:WIRING",
        summary="Short circuit vulnerability causing potential localized thermal melting.",
        consequence="Risk of subassembly degradation under operational stress."
    )
    assert telemetry["assembly_category"] == "ELECTRICAL SYSTEM"
    assert telemetry["thermal_multiplier_active"] is True
    # Base 65 * 1.25 = 81
    assert telemetry["calculated_severity_score"] == 81
    assert "REGIONAL WEATHER WARNING" in telemetry["executive_action_directive"]

def test_calculate_safety_telemetry_structural_low_risk():
    """Verify standard structural parameters return base values with routine monitor directives."""
    telemetry = calculate_safety_telemetry(
        component="REAR CHASSIS MOUNT",
        summary="Cosmetic label misprint on underbody subassembly panel housing.",
        consequence="None recorded."
    )
    assert telemetry["assembly_category"] == "STRUCTURAL CHASSIS MOUNT"
    assert telemetry["thermal_multiplier_active"] is False
    assert telemetry["calculated_severity_score"] == 40
    assert "MONITOR CONDITION" in telemetry["executive_action_directive"]

# ==============================================================================
# 📡 TRACK 2: INTEGRATION API TESTS (ROUTER SCHEMA AGGREGATIONS)
# ==============================================================================

def test_get_vehicle_recalls_empty_payload():
    """Confirm the routing layer handles missing or unindexed parameters cleanly."""
    response = client.get("/api/recalls?make=INVALID&model=NONEXISTENT&year=1900")
    assert response.status_code == 200
    assert response.json() == []

def test_badge_verification_sandbox_default():
    """Assert developer utility route handles sandstone queries and flags the metered pulse validation."""
    response = client.get("/api/recalls/badge-verification?make=FORD&model=TRANSIT-250&year=2022")
    assert response.status_code == 200
    data = response.json()
    assert "safety_status" in data
    assert data["metered_pulse_recorded"] is True