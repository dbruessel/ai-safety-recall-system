import pandas as pd
import os
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path

# Load env variables
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# Severity calculation logic
def calculate_severity(row):
    # Example logic: you can expand this based on your specific safety criteria
    summary = str(row[20]).lower()
    score = 40  # Default baseline
    if any(word in summary for word in ["fire", "crash", "loss of control", "brake"]):
        score = 85
    elif any(word in summary for word in ["label", "sticker", "lighting"]):
        score = 20
    return score

def ingest_flat_file(file_path):
    df = pd.read_csv(file_path, sep='\t', encoding='latin-1', header=None)
    
    batch_size = 100
    for i in range(0, len(df), batch_size):
        batch = df.iloc[i:i+batch_size]
        
        for _, row in batch.iterrows():
            try:
                campaign_number = str(row[1])
                
                # 1. Prepare Definition (Now with severity_score)
                definition = {
                    "campaign_number": campaign_number,
                    "make": str(row[2]),
                    "model": str(row[3]),
                    "year": int(row[4]) if pd.notnull(row[4]) else 0,
                    "component": str(row[6]),
                    "summary": str(row[20]),
                    "severity_score": calculate_severity(row)
                }
                
                sb.table("recall_definitions").upsert(definition, on_conflict="campaign_number").execute()
                
                # 2. Insert Result (The Instance Record)
                result = {"campaign_number": campaign_number, "vin": str(row[0])}
                sb.table("recall_results").insert(result).execute()
                
            except Exception as e:
                print(f"Skipping row {row[1]}: {e}")

if __name__ == "__main__":
    FILE = r"C:\dev\clean-repo\backend\scripts\FLAT_RCL_PRE_2010.txt"
    ingest_flat_file(FILE)