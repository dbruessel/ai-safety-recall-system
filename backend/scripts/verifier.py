import os
import requests
from dotenv import load_dotenv

load_dotenv()

MV_API_KEY = os.getenv("MILLIONVERIFIER_API_KEY")

def verify_single_email(email: str) -> dict:
    """
    Calls MillionVerifier Single API v3.
    Returns: {"result": "ok" | "catch_all" | "invalid" | "disposable" | "error", "quality": str}
    """
    if not email or "@" not in email:
        return {"result": "invalid", "quality": "bad_syntax"}
    
    url = f"https://api.millionverifier.com/api/v3/?api={MV_API_KEY}&email={email.strip()}&timeout=10"
    try:
        res = requests.get(url, timeout=12)
        if res.status_code == 200:
            data = res.json()
            return {
                "result": data.get("result", "error"),
                "quality": str(data.get("quality") or data.get("credits") or "")
            }
    except Exception as e:
        print(f"    [!] MillionVerifier timeout/error for {email}: {e}")
    return {"result": "error", "quality": ""}