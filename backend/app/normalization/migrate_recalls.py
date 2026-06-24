import os
import sys
import importlib.util
from datetime import datetime
from supabase import create_client, Client

# -------------------------------------------------------------------------
# DIRECT PATH BYPASS: Bypassing Python's folder vs module naming collisions
# -------------------------------------------------------------------------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
target_file_path = os.path.join(CURRENT_DIR, "normalization.py")

spec = importlib.util.spec_from_file_location("custom_normalization_module", target_file_path)
normalization_module = importlib.util.module_from_spec(spec)
sys.modules["custom_normalization_module"] = normalization_module
spec.loader.exec_module(normalization_module)

normalize_campaign = normalization_module.normalize_campaign

# Initialize production Supabase client layer (Decoupled from Firestore Client)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def build_doc_id(norm: dict) -> str:
    """
    Generates a clean, human-readable, and deterministic relational lookup string.
    """
    make = str(norm["make"]).strip().upper().replace("/", "-")
    model = str(norm["model"]).strip().upper().replace("/", "-").replace(" ", "_")
    year = str(norm["year"]).strip().upper().replace("/", "-")
    campaign = str(norm["campaign_number"]).strip().upper().replace("/", "-")
    
    return f"{make}_{model}_{year}_{campaign}"


def migrate_batch():
    """
    Legacy Migration Hook. 
    Ingestion successfully transitioned to local flat-file processing into Supabase.
    """
    print("ℹ️ Legacy Firestore migration route archived. Dataset successfully initialized in Supabase.")
    pass


if __name__ == "__main__":
    migrate_batch()