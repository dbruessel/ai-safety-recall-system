Set-Content -Path "adapters\broker_doi_nv.py" -Value @'
import os
import glob
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

CONSUMER_ISPS = {
    'gmail.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'outlook.com',
    'aol.com', 'cox.net', 'msn.com', 'live.com', 'me.com', 'sbcglobal.net',
    'comcast.net', 'charter.net', 'att.net', 'embarqmail.com', 'centurytel.net'
}

CAPTIVE_EXCLUDES = {
    'primerica.com', 'statefarm.com', 'allstate.com', 'farmersagency.com',
    'farmersagent.com', 'amfam.com', 'progressive.com', 'csaa.com', 'geico.com',
    'countryfinancial.com', 'libertymutual.com'
}

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
    'hubinternational.com': 'Hub International',
    'epicbrokers.com': 'EPIC Insurance Brokers',
    'rpsins.com': 'Risk Placement Services',
    'aon.com': 'Aon',
    'lockton.com': 'Lockton Companies',
    'higginbotham.com': 'Higginbotham'
}

def parse_full_name(raw_name):
    if not isinstance(raw_name, str) or not raw_name.strip():
        return "", ""
    parts = raw_name.strip().split()
    if len(parts) == 1:
        return parts[0].title(), ""
    elif len(parts) == 2:
        return parts[0].title(), parts[1].title()
    else:
        return parts[0].title(), parts[-1].title()

def extract():
    candidates = (
        glob.glob("Resident_Producer_List*.xlsx") +
        glob.glob(os.path.join(os.path.expanduser("~"), "Downloads", "Resident_Producer_List*.xlsx")) +
        glob.glob(os.path.join("..", "Resident_Producer_List*.xlsx"))
    )
    if not candidates:
        print("[!] No Nevada DOI spreadsheet found.")
        return []

    file_path = candidates[0]
    print(f"[*] Extracting Nevada DOI brokers from: {file_path}")
    df = pd.read_excel(file_path)

    leads = []
    seen = set()
    for _, row in df.iterrows():
        email = str(row.get('Email Address', '')).strip().lower()
        if not email or '@' not in email or email in seen:
            continue
        domain = email.split('@')[1]
        if domain in CONSUMER_ISPS or domain in CAPTIVE_EXCLUDES:
            continue

        if domain in TARGET_BROKERAGES:
            seen.add(email)
            fn, ln = parse_full_name(row.get('Name', ''))
            leads.append({
                "first_name": fn,
                "last_name": ln,
                "company_name": TARGET_BROKERAGES[domain],
                "email": email,
                "phone": str(row.get('Bus Phone', '')).strip(),
                "job_title": "Commercial Lines Producer",
                "city": str(row.get('City', 'Las Vegas')).strip().title(),
                "state": "NV"
            })
    print(f"[+] Extracted {len(leads)} target commercial brokers.")
    return leads

if __name__ == "__main__":
    results = extract()
    print(f"Test run extracted {len(results)} leads.")
'@