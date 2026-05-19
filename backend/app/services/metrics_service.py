from typing import Dict, Any, List

from google.cloud import firestore

db = firestore.Client()

def _fetch_all_vin_items() -> List[firestore.DocumentSnapshot]:
    """Fetch all VIN items across all batches."""
    vin_items: List[firestore.DocumentSnapshot] = []

    batches_ref = db.collection("vin_batches")
    for batch_doc in batches_ref.stream():
        vin_items_ref = batch_doc.reference.collection("vin_items")
        vin_items.extend(list(vin_items_ref.stream()))

    return vin_items


def compute_global_metrics() -> Dict[str, Any]:
    """
    Compute global metrics across all VINs in all batches.
    Returns a dict ready for API/Frontend consumption.
    """
    vin_docs = _fetch_all_vin_items()

    total_vins = len(vin_docs)
    if total_vins == 0:
        return {
            "total_vins": 0,
            "processed_vins": 0,
            "failed_vins": 0,
            "pending_vins": 0,
            "total_recalls": 0,
            "high_risk_vehicles": 0,
            "average_risk_score": None,
            "average_processing_time_ms": None,
            "fleet_health_index": None,
        }

    processed_vins = 0
    failed_vins = 0
    pending_vins = 0

    total_recalls = 0
    high_risk_vehicles = 0

    risk_scores: List[float] = []
    processing_times: List[float] = []

    for doc in vin_docs:
        data = doc.to_dict() or {}

        status = data.get("status")
        risk_score = data.get("risk_score")
        processing_time_ms = data.get("processing_time_ms")
        recalls = data.get("recalls") or []

        # Status counts
        if status == "complete":
            processed_vins += 1
        elif status == "failed":
            failed_vins += 1
        else:
            pending_vins += 1

        # Recalls
        total_recalls += len(recalls)

        # Risk score
        if isinstance(risk_score, (int, float)):
            risk_scores.append(float(risk_score))
            # Define "high risk" threshold (tune later if needed)
            if risk_score >= 70:
                high_risk_vehicles += 1

        # Processing time
        if isinstance(processing_time_ms, (int, float)):
            processing_times.append(float(processing_time_ms))

    average_risk_score = (
        sum(risk_scores) / len(risk_scores) if risk_scores else None
    )
    average_processing_time_ms = (
        sum(processing_times) / len(processing_times) if processing_times else None
    )

    # Simple fleet health index: 100 - average_risk_score (clamped)
    fleet_health_index = None
    if average_risk_score is not None:
        fleet_health_index = max(0.0, min(100.0, 100.0 - average_risk_score))

    return {
        "total_vins": total_vins,
        "processed_vins": processed_vins,
        "failed_vins": failed_vins,
        "pending_vins": pending_vins,
        "total_recalls": total_recalls,
        "high_risk_vehicles": high_risk_vehicles,
        "average_risk_score": average_risk_score,
        "average_processing_time_ms": average_processing_time_ms,
        "fleet_health_index": fleet_health_index,
    }
