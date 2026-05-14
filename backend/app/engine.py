# backend/app/engine.py

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