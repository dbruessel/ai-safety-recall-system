from pydantic import BaseModel
from typing import Optional


class RecallCreate(BaseModel):
    title: str
    description: str
    status: str
    vin: str
    nhtsa_id: str
    category: Optional[str] = "other"
    priority: Optional[str] = "medium"
    risk_level: Optional[str] = "medium"          # NEW
    imminent_risk_score: Optional[int] = 50       # NEW
    ai_summary: Optional[str] = None              # NEW
    explainable_message: Optional[str] = None     # NEW


class Recall(RecallCreate):
    id: str


class RecallUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    vin: Optional[str] = None
    nhtsa_id: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    risk_level: Optional[str] = None              # NEW
    imminent_risk_score: Optional[int] = None     # NEW
    ai_summary: Optional[str] = None              # NEW
    explainable_message: Optional[str] = None     # NEW
