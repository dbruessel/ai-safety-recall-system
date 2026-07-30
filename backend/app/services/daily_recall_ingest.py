import os
import zipfile
import requests
import tempfile
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

NHTSA_FLAT_FILE_URL = "https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL_POST_2010.zip"

def calculate_severity(summary_text: str) -> int:
    summary = str(summary_text).lower()
    if any(word in summary for word in ["fire", "crash", "loss of control", "brake"]):
        return 85
    elif any(word in summary for word in ["label", "sticker", "lighting"]):
        return 20
    return 40

def run_daily_ingestion():
    print("Starting ultra-lean daily 3 AM recall ingestion...")

    # Create a temporary directory to store files on disk instead of holding in RAM
    with tempfile.TemporaryDirectory() as temp_dir:
        zip_path = os.path.join(temp_dir, "recalls.zip")

        # 2. Stream download to disk in 8KB chunks (RAM stays flat)
        print("Downloading NHTSA zip file to disk...")
        with requests.get(NHTSA_FLAT_FILE_URL, stream=True, timeout=120) as r:
            r.raise_for_status()
            with open(zip_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

        # 3. Extract to disk
        print("Extracting zip file...")
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(temp_dir)
            extracted_files = [f for f in z.namelist() if not f.startswith("__MACOSX")]
            txt_path = os.path.join(temp_dir, extracted_files[0])

        # 4. Read the extracted file from disk line-by-line / chunk-by-chunk
        print("Processing CSV in chunks...")
        chunks = pd.read_csv(
            txt_path, 
            sep='\t', 
            encoding='latin-1', 
            header=None, 
            low_memory=False,
            on_bad_lines='skip',
            quoting=3,
            chunksize=1000,
            # usecols speeds up parsing & reduces pandas overhead dramatically
            usecols=[1, 2, 3, 4, 6, 20] 
        )

        total_processed = 0

        for chunk_idx, chunk in enumerate(chunks):
            definitions = []

            for _, row in chunk.iterrows():
                try:
                    # Column mapping based on usecols=[1, 2, 3, 4, 6, 20]:
                    # row[1]=col 1, row[2]=col 2, row[3]=col 3, row[4]=col 4, row[6]=col 6, row[20]=col 20
                    campaign_number = str(row[1]) if pd.notnull(row[1]) else None
                    if not campaign_number or campaign_number.strip() == "":
                        continue

                    summary_text = str(row[20]) if pd.notnull(row[20]) else ""

                    definition = {
                        "campaign_number": campaign_number,
                        "make": str(row[2]) if pd.notnull(row[2]) else "",
                        "model": str(row[3]) if pd.notnull(row[3]) else "",
                        "year": int(row[4]) if pd.notnull(row[4]) and str(row[4]).isdigit() else 0,
                        "component": str(row[6]) if pd.notnull(row[6]) else "",
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
                print(f"Processed chunk {chunk_idx} (~{total_processed} records synced)...")

    print(f"SUCCESS! Daily ingestion complete. Total records processed: {total_processed}")

if __name__ == "__main__":
    run_daily_ingestion()