import logging
import os
import stripe
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# =====================================================================
# LOAD LOCAL ENVIRONMENT VARIABLES
# =====================================================================
load_dotenv()

logger = logging.getLogger("payment-router")

STRIPE_API_KEY = os.getenv("STRIPE_SECRET_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Defensive Configuration Check
if not SUPABASE_SERVICE_KEY:
    raise ValueError(
        "CRITICAL STARTUP ERROR: 'SUPABASE_SERVICE_KEY' is missing from your environment variables!\n"
        "Please ensure it is defined in your backend/.env file."
    )

# Initialize APIs
stripe.api_key = STRIPE_API_KEY
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

router = APIRouter(prefix="/payments", tags=["payments"])

# Map flat-fee subscription tiers to true Stripe Price IDs
PRICE_TIER_MAPPING = {
    "standard": "price_1TrlFTDXs4xycz0o1e9gfg9d",      # $99/mo Standard
    "professional": "price_1TsR6jDXs4xycz0ohAfewQgk",   # $249/mo Professional
    "enterprise": "price_1TrlFxDXs4xycz0ofyuV70Rf"      # $499/mo Enterprise
}

class CheckoutRequest(BaseModel):
    plan_type: Optional[str] = "standard"
    user_id: Optional[str] = "dennisbruessel@hotmail.com"

class VerifySessionRequest(BaseModel):
    session_id: str

# =====================================================================
# ENDPOINT: CREATE SECURE STRIPE-HOSTED CHECKOUT SESSION
# =====================================================================
@router.post("/create-checkout-session")
async def create_checkout_session(request: Optional[CheckoutRequest] = None):
    """
    Spins up a secure Stripe Checkout Session in Hosted Redirection mode
    for RecallLogic: Verified Safety Intelligence tiers.
    """
    try:
        plan_type = request.plan_type if request and request.plan_type else "standard"
        user_id = request.user_id if request and request.user_id else "dennisbruessel@hotmail.com"

        price_id = PRICE_TIER_MAPPING.get(plan_type)
        if not price_id:
            price_id = PRICE_TIER_MAPPING["standard"]

        frontend_base = os.getenv("FRONTEND_URL", "http://localhost:5173")

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            customer_email=user_id if "@" in user_id else None,
            success_url=f"{frontend_base}/?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_base}/?canceled=true",
            metadata={
                "plan_type": plan_type,
                "user_id": user_id
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
        session = stripe.checkout.Session.retrieve(req.session_id)
        
        if session.payment_status != "paid":
            return {
                "status": "pending",
                "message": "Payment processing. Please hold..."
            }
            
        email = session.customer_details.email if session.customer_details else None
        if not email:
            raise HTTPException(status_code=400, detail="Checkout session contains no valid customer email.")
            
        assigned_tier = session.metadata.get("plan_type", "standard") if session.metadata else "standard"
        
        supabase_admin.table("profiles").update({
            "tier": assigned_tier,
            "is_pro": True
        }).eq("email", email).execute()

        supabase_admin.table("leads").update({
            "lead_status": "Stripe Completed"
        }).eq("contact_email", email).execute()

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