import pandas as pd
import re
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Sample structured dataset representing P&C Commercial Lines Entities from State/NIPR Registries
sample_broker_data = [
    {
        "company_name": "Hub International Insurance Services",
        "first_name": "Risk",
        "last_name": "Management",
        "city": "Las Vegas",
        "state": "NV",
        "domain": "hubinternational.com",
        "type": "broker",
        "qc_status": "pending"
    },
    {
        "company_name": "USI Insurance Services LLC",
        "first_name": "Commercial",
        "last_name": "Lines",
        "city": "Phoenix",
        "state": "AZ",
        "domain": "usi.com",
        "type": "broker",
        "qc_status": "pending"
    },
    {
        "company_name": "Acrisure Commercial Risk",
        "first_name": "Transportation",
        "last_name": "Department",
        "city": "Salt Lake City",
        "state": "UT",
        "domain": "acrisure.com",
        "type": "broker",
        "qc_status": "pending"
    },
    {
        "company_name": "Risk Theory Freight Specialists",
        "first_name": "Fleet",
        "last_name": "Advisor",
        "city": "Dallas",
        "state": "TX",
        "domain": "risktheory.com",
        "type": "broker",
        "qc_status": "pending"
    }
]

def ingest_sample_brokers():
    print(f"--- INGESTING {len(sample_broker_data)} SAMPLE P&C BROKERS ---")
    df = pd.DataFrame(sample_broker_data)
    
    records = df.to_dict(orient="records")
    
    try:
        res = supabase.table("leads").upsert(records, on_conflict="company_name").execute()
        print(f"✓ Successfully staged {len(res.data)} commercial P&C agencies in Supabase.")
    except Exception as e:
        print(f"❌ Ingestion error: {e}")

if __name__ == "__main__":
    ingest_sample_brokers()