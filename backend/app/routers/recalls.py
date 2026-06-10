from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from google.cloud import firestore

# Initialize the router namespace
# FIXED: Changed prefix to "" because main.py already applies the "/api" prefix globally
router = APIRouter(
    prefix="",
    tags=["recalls"]
)

# Initialize Firestore
db = firestore.Client()
NORM_COLLECTION = "recalls_normalized"

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
    Query the newly populated, pristine dataset by Make, Model, and Year.
    """
    try:
        target_make = make.strip().upper()
        target_model = model.strip().upper()
        target_year = year.strip().upper()

        # Target our brand new 25,041 record collection
        query_ref = (
            db.collection(NORM_COLLECTION)
            .where("make", "==", target_make)
            .where("model", "==", target_model)
            .where("year", "==", target_year)
        )

        results = []
        for doc in query_ref.stream():
            results.append(doc.to_dict())

        return results

    except Exception as e:
        print(f"❌ Database Query Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Error querying normalized recall data.")