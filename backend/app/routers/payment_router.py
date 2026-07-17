from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import stripe
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# =====================================================================
# LOAD LOCAL ENVIRONMENT VARIABLES
# =====================================================================
load_dotenv()

STRIPE_API_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_51P...")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ygbiurcvparmwfaqrtg.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Grab the key using either standard naming convention
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Defensive Configuration Check
if not SUPABASE_SERVICE_KEY:
    raise ValueError(
        "CRITICAL STARTUP ERROR: 'SUPABASE_SERVICE_KEY' is missing from your environment variables!\n"
        "Please ensure it is defined in your 'C:\\dev\\clean-repo\\backend\\.env' file."
    )

# Initialize APIs
stripe.api_key = STRIPE_API_KEY
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

router = APIRouter(prefix="/api/payments", tags=["payments"])

class VerifySessionRequest(BaseModel):
    session_id: str

# =====================================================================
# ENDPOINT: SECURE AUTO-LOGIN REDIRECTION EXCHANGER
# =====================================================================
@router.post("/verify-session")
async def verify_session(req: VerifySessionRequest):
    """
    Called by the frontend when a user lands on the Stripe redirect success URL.
    Polls/verifies Stripe checkout status synchronously, syncs database status,
    and returns a one-time Supabase magic link to instantly log the user in.
    """
    try:
        # 1. Retrieve the checkout session directly from Stripe
        session = stripe.checkout.Session.retrieve(req.session_id)
        
        # 2. If checkout is still pending processing, let frontend know to keep polling
        if session.payment_status != "paid":
            return {
                "status": "pending",
                "message": "Payment processing. Please hold..."
            }
            
        # 3. Extract the verified customer email
        email = session.customer_details.email if session.customer_details else None
        if not email:
            raise HTTPException(status_code=400, detail="Checkout session contains no valid customer email.")
            
        # 4. Synchronous Fallback Sync: Ensure leads table is updated immediately
        supabase_admin.table("leads").update({
            "lead_status": "Stripe Completed"
        }).eq("contact_email", email).execute()

        # 5. Generate secure, one-time Supabase login redirection credentials
        frontend_redirect_url = "http://localhost:5173/?setup_password=true"
        
        link_response = supabase_admin.auth.admin.generate_link({
            "type": "magiclink",
            "email": email,
            "options": {
                "redirect_to": frontend_redirect_url
            }
        })
        
        login_url = link_response.properties.action_link
        
        return {
            "status": "paid",
            "email": email,
            "login_url": login_url
        }
        
    except stripe.error.StripeError as e:
        print(f"Stripe Retrieval Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe session verification failed: {str(e)}")
    except Exception as e:
        print(f"Internal Handshake Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate secure auto-login credentials: {str(e)}")