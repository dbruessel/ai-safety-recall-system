import os
import io
import zipfile
import requests
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

# 1. Load Supabase Environment Variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables.")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# Active HTTPS endpoint for post-2010 NHTSA recalls
NHTSA_FLAT_FILE_URL = "https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL_POST_2010.zip"

def calculate_severity(summary_text: str) -> int:
    """Calculates severity score based on key risk terms."""
    summary = str(summary_text).lower()
    if any(word in summary for word in ["fire", "crash", "loss of control", "brake"]):
        return 85
    elif any(word in summary for word in ["label", "sticker", "lighting"]):
        return 20
    return 40

def run_daily_ingestion():
    print("Starting memory-efficient daily 3 AM recall ingestion from NHTSA...")

    # 2. Download zip file from NHTSA
    response = requests.get(NHTSA_FLAT_FILE_URL, timeout=60)
    response.raise_for_status()

    # 3. Stream in CHUNKS (Keeps RAM under 100 MB!)
    with zipfile.ZipFile(io.BytesIO(response.content)) as z:
        txt_filename = z.namelist()[0]
        with z.open(txt_filename) as f:
            
            # chunksize=1000 processes 1,000 rows at a time without overloading RAM
            chunks = pd.read_csv(
                f, 
                sep='\t', 
                encoding='latin-1', 
                header=None, 
                low_memory=False,
                on_bad_lines='skip',
                quoting=3,
                chunksize=1000
            )

            total_processed = 0

            for chunk_idx, chunk in enumerate(chunks):
                definitions = []

                for _, row in chunk.iterrows():
                    try:
                        campaign_number = str(row[1]) if pd.notnull(row[1]) else None
                        if not campaign_number:
                            continue

                        summary_text = str(row[20]) if len(row) > 20 and pd.notnull(row[20]) else ""

                        definition = {
                            "campaign_number": campaign_number,
                            "make": str(row[2]) if len(row) > 2 and pd.notnull(row[2]) else "",
                            "model": str(row[3]) if len(row) > 3 and pd.notnull(row[3]) else "",
                            "year": int(row[4]) if len(row) > 4 and pd.notnull(row[4]) and str(row[4]).isdigit() else 0,
                            "component": str(row[6]) if len(row) > 6 and pd.notnull(row[6]) else "",
                            "summary": summary_text,
                            "severity_score": calculate_severity(summary_text)
                        }
                        definitions.append(definition)
                    except Exception:
                        continue

                # Batch upsert to Supabase
                if definitions:
                    try:
                        sb.table("recall_definitions").upsert(
                            definitions, 
                            on_conflict="campaign_number"
                        ).execute()
                        total_processed += len(definitions)
                    except Exception as e:
                        print(f"Error on chunk {chunk_idx}: {e}")

                if chunk_idx % 10 == 0:
                    print(f"Processed chunk {chunk_idx} (~{total_processed} records synced so far)...")

    print(f"SUCCESS! Daily ingestion complete. Total records processed: {total_processed}")

if __name__ == "__main__":
    run_daily_ingestion()