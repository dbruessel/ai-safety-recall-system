import pandas as pd
import warnings
warnings.filterwarnings('ignore')

INPUT_FILE = "Resident_Producer_List_Nov-04-2026.xlsx"
OUTPUT_FILE = "clean_nv_commercial_brokers_1000.csv"

# Target commercial brokerage domain mapping
TARGET_BROKERAGES = {
    'ajg.com': 'Arthur J. Gallagher & Co.',
    'lpins.net': 'LP Insurance Services',
    'marshmma.com': 'Marsh McLennan Agency',
    'acrisure.com': 'Acrisure',
    'assuredpartners.com': 'AssuredPartners',
    'usi.com': 'USI Insurance Services',
    'cragin-pike.com': 'Cragin & Pike',
    'aleragroup.com': 'Alera Group',
    'leavitt.com': 'Leavitt Group',
    'alliant.com': 'Alliant Insurance Services',
    'wtwco.com': 'Willis Towers Watson',
    'swartsmanning.com': 'Swarts, Manning & Associates',
    'amwins.com': 'Amwins Group',
    'bbrown.com': 'Brown & Brown Insurance',
    'bbins.com': 'Brown & Brown Insurance',
    'ioausa.com': 'Insurance Office of America',
    'nfp.com': 'NFP',
    'hubinternational.com': 'Hub International',
    'epicbrokers.com': 'EPIC Insurance Brokers',
    'rpsins.com': 'Risk Placement Services',
    'aon.com': 'Aon',
    'lockton.com': 'Lockton Companies',
    'higginbotham.com': 'Higginbotham'
}

def parse_full_name(raw_name):
    """Splits 'FIRST MIDDLE LAST' or 'LAST, FIRST' into clean first and last names."""
    if not isinstance(raw_name, str) or not raw_name.strip():
        return "", ""
    parts = raw_name.strip().split()
    if len(parts) == 1:
        return parts[0].title(), ""
    elif len(parts) == 2:
        return parts[0].title(), parts[1].title()
    else:
        # Handles middle names / initials (e.g., TIMOTHY N HOLLAND -> Timothy, Holland)
        return parts[0].title(), parts[-1].title()

def main():
    print("Reading DOI Excel file...")
    df = pd.read_excel(INPUT_FILE)
    
    df['email_clean'] = df['Email Address'].astype(str).str.strip().str.lower()
    df['domain'] = df['email_clean'].apply(lambda x: x.split('@')[1] if '@' in x else '')
    
    # Filter strictly to target commercial brokerages
    broker_df = df[df['domain'].isin(TARGET_BROKERAGES.keys())].copy()
    
    # Drop duplicates by email
    broker_df = broker_df.drop_duplicates(subset=['email_clean'])
    
    processed_records = []
    for _, row in broker_df.iterrows():
        first_name, last_name = parse_full_name(row['Name'])
        domain = row['domain']
        company_name = TARGET_BROKERAGES.get(domain, "Commercial Brokerage")
        
        city = str(row['City']).strip().title() if pd.notna(row['City']) else "Las Vegas"
        phone = str(row['Bus Phone']).strip() if pd.notna(row['Bus Phone']) else ""
        
        processed_records.append({
            "first_name": first_name,
            "last_name": last_name,
            "company_name": company_name,
            "email": row['email_clean'],
            "phone": phone,
            "job_title": "Commercial Lines Producer",
            "domain": domain,
            "city": city,
            "state": "NV",
            "lead_type": "commercial_broker",
            "health_status": "ready_to_contact",
            "qc_status": "approved",
            "campaign_status": "staged",
            "pushed_to_instantly": False
        })
        
    out_df = pd.DataFrame(processed_records)
    out_df.to_csv(OUTPUT_FILE, index=False)
    print(f"Extraction complete! Saved {len(out_df)} commercial brokers to '{OUTPUT_FILE}'.")

if __name__ == "__main__":
    main()