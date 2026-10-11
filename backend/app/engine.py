# backend/app/engine.py
import os
from supabase import create_client, Client
from app.config import settings

# 1. Supabase Client Initialization
supabase_url: str = settings.supabase_url or os.environ.get("SUPABASE_URL", "")
supabase_key: str = settings.supabase_service_key or os.environ.get("SUPABASE_SERVICE_KEY", "")

supabase: Client = create_client(supabase_url, supabase_key)

def get_supabase() -> Client:
    return supabase

def get_supabase_client() -> Client:
    return supabase


# 2. Las Vegas Thermal & Recall Priority Scoring
def calculate_recall_risk(recall_data: dict, current_temp: int = 105) -> int:
    """
    Business logic to convert raw recall data into a priority score (0-100).
    """
    score = 10  # Starting base score
    description = recall_data.get("description", "").upper()
    
    # Severity check
    if "STOP DRIVE" in description or "FIRE" in description:
        score += 60
    elif "STALL" in description or "BRAKE" in description:
        score += 30
        
    # The "Las Vegas" thermal logic
    thermal_risks = ["BATTERY", "COOLING", "OVERHEAT", "ELECTRICAL"]
    if current_temp > 100 and any(x in description for x in thermal_risks):
        score += 25
        
    return min(score, 100)