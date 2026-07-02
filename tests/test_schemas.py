# tests/test_schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TestStep(BaseModel):
    step: int = Field(..., description="Sequential step number starting at 1")
    action: str = Field(..., description="Action type, e.g., RESET_STATE, UPLOAD_MANIFEST, GENERATE_BADGE, TRIGGER_INGEST")
    payload: Optional[Dict[str, Any]] = Field(default=None, description="Request body arguments")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Query params, file uploads, or mock configurations")
    expected_status: int = Field(default=200, description="The expected HTTP status code return gate")

class JSONTaskMatrix(BaseModel):
    workflow_id: str = Field(..., description="Unique slugified identifier for the workflow")
    description: str = Field(..., description="The user story being validated")
    steps: List[TestStep] = Field(..., description="Array of sequential execution steps")
