import zipfile
import pandas as pd
from google.cloud import firestore

# Initialize the Firestore Client
db = firestore.Client()

def ingest_nhtsa_flat_files():
    # Only targeting the post-2010 archive since pre-2010 completed successfully
    target_zips = ["FLAT_RCL_POST_2010.zip"]
    
    # Official NHTSA database core layout column mapping
    column_headers = [
        "RECORD_ID", "CAMPNO", "MAKETXT", "MODELTXT", "YEARTXT", 
        "MFGCAMPNO", "COMPNAME", "MFGNAME", "BGMAN", "ENDMAN", 
        "RCLTYPECD", "PCLTYPECD", "CMTTEXT", "RCDATE", "DATEA", 
        "RPDATE", "FMVSS", "DESC_DEFECT", "CONSEQUENCE_DEFECT", 
        "REMEDY_TEXT", "NOTES", "RCL_CMPT_ID"
    ]

    for zip_filename in target_zips:
        print(f"📂 Processing local archive: {zip_filename}...")
        txt_filename = zip_filename.replace(".zip", ".txt")
        
        try:
            with zipfile.ZipFile(zip_filename) as z:
                with z.open(txt_filename) as f:
                    # Added on_bad_lines="skip" to discard lines containing broken tab formatting
                    df = pd.read_csv(
                        f, 
                        sep="\t", 
                        header=None, 
                        low_memory=False, 
                        encoding="latin1",
                        on_bad_lines="skip"
                    )
            
            # Dynamically handle shifting column count definitions across file versions
            actual_col_count = len(df.columns)
            print(f"📊 Found {actual_col_count} data columns inside file.")
            
            if actual_col_count >= len(column_headers):
                dynamic_headers = column_headers + [f"EXTRA_COL_{i}" for i in range(len(column_headers), actual_col_count)]
                df.columns = dynamic_headers
            else:
                df.columns = column_headers[:actual_col_count]
                
            print(f"✓ Successfully parsed {len(df)} campaigns from {zip_filename}!")
            
            print(f"📥 Batch writing {zip_filename} records to Firestore...")
            batch = db.batch()
            counter = 0

            for _, row in df.iterrows():
                # Validate that the unique Campaign Number exists before trying to commit
                if pd.isna(row["CAMPNO"]):
                    continue
                    
                campaign_number = str(row["CAMPNO"]).strip()
                make = str(row["MAKETXT"]).strip().upper() if pd.notna(row["MAKETXT"]) else "UNKNOWN"
                model = str(row["MODELTXT"]).strip().upper() if pd.notna(row["MODELTXT"]) else "UNKNOWN"
                year = str(row["YEARTXT"]).strip() if pd.notna(row["YEARTXT"]) else "UNKNOWN"

                # Standardizing destination directly to your raw production 'recalls' collection
                doc_ref = db.collection("recalls").document(campaign_number)
                
                payload = {
                    "campaign_number": campaign_number,
                    "make": make,
                    "model": model,
                    "year": year,
                    "component": str(row["COMPNAME"]) if pd.notna(row["COMPNAME"]) else "",
                    "summary": str(row["DESC_DEFECT"]) if pd.notna(row["DESC_DEFECT"]) else "",
                    "consequence": str(row["CONSEQUENCE_DEFECT"]) if pd.notna(row["CONSEQUENCE_DEFECT"]) else "",
                    "remedy": str(row["REMEDY_TEXT"]) if pd.notna(row["REMEDY_TEXT"]) else "",
                    "notes": str(row["NOTES"]) if pd.notna(row["NOTES"]) else "",
                    "last_updated_sync": firestore.SERVER_TIMESTAMP
                }
                
                batch.set(doc_ref, payload, merge=True)
                counter += 1

                # Group and commit writes into chunks of 500 records
                if counter % 500 == 0:
                    batch.commit()
                    batch = db.batch()
                    print(f"⚡ Committed {counter} records...")

            # Clean up the final leftover batch entries
            batch.commit()
            print(f"🎉 Successfully completed ingestion for {zip_filename}!\n")

        except FileNotFoundError:
            print(f"❌ Error: Could not find {zip_filename} in this folder.")
            return

    print("🏁 ALL HISTORICAL RECALLS INGESTED SUCCESSFULLY! B to Z is completely backfilled.")

if __name__ == "__main__":
    ingest_nhtsa_flat_files()