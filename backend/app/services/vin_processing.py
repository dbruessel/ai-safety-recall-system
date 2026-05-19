import time
from app.services.vin_batches import update_vin_item
from app.services.recall_service import decode_vin, get_recalls_for_vin
from app.services.context_builder import build_context
from app.services.intelligence_service import analyze_context


def process_single_vin(batch_id: str, vin: str, location: dict | None = None):
    try:
        # 1. Mark VIN as processing
        update_vin_item(batch_id, vin, status="processing")

        start = time.time()

        # 2. Decode VIN
        decoded_data = decode_vin(vin)

        # 3. Fetch recalls
        recall_results = get_recalls_for_vin(vin)

        # 4. Build full intelligence context
        context = build_context(
            vin=vin,
            decoded_data=decoded_data,
            recalls=recall_results,
            location=location or {"region": "NV"},
        )

        # 5. AI analysis
        ai_output = analyze_context(context)

        elapsed_ms = int((time.time() - start) * 1000)

        # 6. Mark VIN as complete
        update_vin_item(
            batch_id=batch_id,
            vin=vin,
            status="complete",
            raw_data=decoded_data,
            recalls=recall_results,
            ai_summary=ai_output["ai_summary"],
            risk_score=ai_output["imminent_risk_score"],
            processing_time_ms=elapsed_ms
        )

    except Exception as e:
        # 7. Mark VIN as failed
        update_vin_item(
            batch_id=batch_id,
            vin=vin,
            status="failed",
            error_message=str(e)
        )
