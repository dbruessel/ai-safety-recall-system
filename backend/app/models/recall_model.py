from pydantic import BaseModel
from typing import Optional


class RecallCreate(BaseModel):
    title: str
    description: str
    status: str
    vin: str
    nhtsa_id: str


class Recall(RecallCreate):
    id: str


class RecallUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    vin: Optional[str] = None
    nhtsa_id: Optional[str] = None
