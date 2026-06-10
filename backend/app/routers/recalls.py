from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from google.cloud import firestore

# Initialize the router namespace
router = APIRouter(
    prefix="",
    tags=["recalls"]
)

# Initialize Firestore
db = firestore.Client()
# Aligned directly with your worker pipeline production target
TRUE_RESULTS_COLLECTION = "recall_results"

# Define the data contract for your frontend
class RecallResponse(BaseModel):
    campaign_number: str
    make: str
    model: str
    year: str
    component: str
    summary: Optional[str] = ""
    consequence: Optional[str] = ""
    remedy: Optional[str] = ""
    notes: Optional[str] = ""

    class Config:
        from_attributes = True


@router.get("/recalls", response_model=List[RecallResponse])
async def get_vehicle_recalls(
    make: str = Query(..., description="Vehicle Make (e.g., FORD)"),
    model: str = Query(..., description="Vehicle Model (e.g., F-150)"),
    year: str = Query(..., description="Vehicle Model Year (e.g., 2018)")
):
    """
    Query the active, cleaned dataset by Make, Model, and Year.
    Un-nests NHTSA payload structures to serve flat fields to Next.js.
    """
    try:
        target_make = make.strip().upper()
        target_model = model.strip().upper()
        target_year = year.strip().upper()

        # Query your active production results collection
        query_ref = (
            db.collection(TRUE_RESULTS_COLLECTION)
            .where(filter=firestore.FieldFilter("make", "==", target_make))
            .where(filter=firestore.FieldFilter("model", "==", target_model))
            .where(filter=firestore.FieldFilter("year", "==", target_year))
        )

        flat_results = []
        
        # Pull documents matching this vehicle query parameters
        for doc in query_ref.stream():
            doc_data = doc.to_dict() or {}
            
            # Un-nest the raw API response dictionary maps stored inside the record doc
            api_payload = doc_data.get("result") or {}
            nhtsa_recalls_array = api_payload.get("results") or []
            
            for item in nhtsa_recalls_array:
                # Map messy api casing directly onto your strict data schema requirements
                flat_results.append({
                    "campaign_number": item.get("campaignNumber", "UNKNOWN"),
                    "make": item.get("make", target_make),
                    "model": item.get("model", target_model),
                    "year": item.get("modelYear", target_year),
                    "component": item.get("component", "UNKNOWN"),
                    "summary": item.get("summary", ""),
                    "consequence": item.get("consequence", ""),
                    "remedy": item.get("remedy", ""),
                    "notes": item.get("notes", "")
                })

        return flat_results

    except Exception as e:
        print(f"❌ Database Query Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Error querying production recall results.")