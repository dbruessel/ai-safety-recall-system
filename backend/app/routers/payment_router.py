import logging
import os
import stripe
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# =====================================================================
# LOAD LOCAL ENVIRONMENT VARIABLES
# =====================================================================
load_dotenv()

logger = logging.getLogger("payment-router")

STRIPE_API_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_51P...")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ygbiurcvparmwfaqrtg.supabase.co")

# Grab the Supabase service key securely
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

# Map your flat-fee tier slugs to actual Stripe Price IDs
PRICE_TIER_MAPPING = {
    "standard": "price_1TrlFTDXs4xycz0o1e9gfg9d",      # $99/mo Standard
    "professional": "price_1TsR6jDXs4xycz0ohAfewQgk",   # $249/mo Professional
    "enterprise": "price_1TrlFxDXs4xycz0ofyuV70Rf"      # $499/mo Enterprise
}

class CheckoutRequest(BaseModel):
    plan_type: str # Must be "standard", "professional", or "enterprise"
    user_id: str   # User email or account ID

class VerifySessionRequest(BaseModel):
    session_id: str

# =====================================================================
# ENDPOINT: CREATE SECURE STRIPE-HOSTED CHECKOUT SESSION
# =====================================================================
@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    """
    Spins up a secure Stripe Checkout Session in Hosted Redirection mode
    for RecallLogic: Verified Safety Intelligence tiers.
    """
    try:
        price_id = PRICE_TIER_MAPPING.get(request.plan_type)
        if not price_id:
            raise HTTPException(status_code=400, detail=f"Invalid plan type selected: {request.plan_type}")

        # Determine frontend origin for success/cancel redirects
        frontend_base = os.getenv("FRONTEND_URL", "http://localhost:5173")

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            customer_email=request.user_id if "@" in request.user_id else None,
            success_url=f"{frontend_base}/?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_base}/?canceled=true",
            metadata={
                "plan_type": request.plan_type,
                "user_id": request.user_id
            }
        )

        return {"url": checkout_session.url}

    except stripe.error.StripeError as e:
        logger.error(f"Stripe Session Creation Failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        logger.error(f"Internal Checkout Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")


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
            
        # 4. Synchronous Sync: Update profile/leads table to active tier status
        assigned_tier = session.metadata.get("plan_type", "standard")
        
        supabase_admin.table("profiles").update({
            "tier": assigned_tier,
            "is_pro": True
        }).eq("email", email).execute()

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
        logger.error(f"Stripe Retrieval Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe session verification failed: {str(e)}")
    except Exception as e:
        logger.error(f"Internal Handshake Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate secure auto-login credentials: {str(e)}")