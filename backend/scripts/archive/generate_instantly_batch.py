import pandas as pd
import re
import urllib.parse

# 1. Load Raw CSV File (Replace with your actual filename)
INPUT_FILE = "sircon_raw_agencies.csv"
OUTPUT_FILE = "instantly_daily_30_batch.csv"
PROCESSED_LOG = "processed_agencies_log.txt"

def clean_text(val):
    if pd.isna(val):
        return ""
    return str(val).strip()

def is_commercial_agency(name):
    """Filters out non-commercial shops (Smog, DMV, Tax, Personal lines)."""
    name_upper = name.upper()
    exclude_keywords = ["SMOG", "DMV", "TAX", "NOTARY", "BAIL", "FUNERAL", "TITLE", "TRAVEL"]
    for kw in exclude_keywords:
        if kw in name_upper:
            return False
    return True

def generate_email_permutations(first_name, last_name, domain):
    """Generates the top standard business email patterns."""
    if not domain or not first_name:
        return ""
    
    fn = first_name.lower().replace(" ", "")
    ln = last_name.lower().replace(" ", "")
    dom = domain.lower().replace("http://", "").replace("https://", "").replace("www.", "").strip('/')

    # Top corporate email patterns
    p1 = f"{fn}@{dom}"               # john@domain.com
    p2 = f"{fn}.{ln}@{dom}"          # john.smith@domain.com
    p3 = f"{fn[0]}{ln}@{dom}"         # jsmith@domain.com
    
    return f"{p1} | {p2} | {p3}"

def generate_google_search_url(agency_name, city="Las Vegas"):
    """Generates a pre-configured Google search URL to find the owner/principal in 1 click."""
    query = f'"{agency_name}" "{city}" owner OR principal OR president OR DRLP'
    encoded_query = urllib.parse.quote(query)
    return f"https://www.google.com/search?q={encoded_query}"

def process_batch(batch_size=30):
    try:
        df = pd.read_csv(INPUT_FILE)
    except FileNotFoundError:
        print(f"Error: {INPUT_FILE} not found. Ensure your raw CSV is in the same folder.")
        return

    # Load history of already processed entities so you never hit the same agency twice
    try:
        with open(PROCESSED_LOG, "r") as f:
            processed_list = set(line.strip() for line in f)
    except FileNotFoundError:
        processed_list = set()

    # Identify primary columns (handles common naming variations from Sircon/SilverFlume exports)
    name_col = next((c for c in df.columns if "name" in c.lower()), df.columns[0])
    
    # Try to find existing contact / domain / email fields if present
    email_col = next((c for c in df.columns if "email" in c.lower()), None)
    
    instantly_leads = []
    newly_processed = []

    for _, row in df.iterrows():
        if len(instantly_leads) >= batch_size:
            break

        agency_name = clean_text(row[name_col])
        
        # Skip empty, already processed, or non-commercial agencies
        if not agency_name or agency_name in processed_list or not is_commercial_agency(agency_name):
            continue

        # Extract domain from email if available
        raw_email = clean_text(row[email_col]) if email_col else ""
        domain = raw_email.split("@")[-1] if "@" in raw_email else ""

        # Attempt to pull owner/principal name if present, else create OSINT lookup link
        first_name = clean_text(row.get("First Name", ""))
        last_name = clean_text(row.get("Last Name", ""))
        
        email_patterns = generate_email_permutations(first_name, last_name, domain) if first_name else raw_email
        osint_link = generate_google_search_url(agency_name)

        # Build Instantly-ready schema
        lead = {
            "First Name": first_name,
            "Last Name": last_name,
            "Company Name": agency_name,
            "Email": raw_email if raw_email else email_patterns,
            "Email Permutations": email_patterns,
            "Domain": domain,
            "City": "Las Vegas",
            "State": "NV",
            "OSINT Owner Search Link": osint_link
        }

        instantly_leads.append(lead)
        newly_processed.append(agency_name)

    if not instantly_leads:
        print("No new commercial agencies found to process.")
        return

    # Output to daily CSV
    out_df = pd.DataFrame(instantly_leads)
    out_df.to_csv(OUTPUT_FILE, index=False)
    
    # Update log history
    with open(PROCESSED_LOG, "a") as f:
        for name in newly_processed:
            f.write(f"{name}\n")

    print(f"Successfully generated {len(instantly_leads)} leads in '{OUTPUT_FILE}'.")
    print(f"Updated '{PROCESSED_LOG}' to ensure zero duplicate reaches in future batches.")

if __name__ == "__main__":
    process_batch(batch_size=30)