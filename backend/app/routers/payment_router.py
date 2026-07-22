import logging
import os
from typing import Optional
import stripe
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.config import get_settings

# Initialize Logger
logger = logging.getLogger("payment-router")

# Retrieve Global SaaS Configurations
try:
    settings = get_settings()
except Exception:
    from app.config import settings

# Initialize Stripe API Client
stripe.api_key = settings.STRIPE_SECRET_KEY

# Register payments route group
router = APIRouter(prefix="/payments", tags=["payments"])

# Stripe Price Tier IDs
PRICE_TIER_MAPPING = {
    "standard": "price_1TrlFTDXs4xycz0o1e9gfg9d",     # $99/mo Standard
    "professional": "price_1TsR6jDXs4xycz0ohAfewQgk",   # $249/mo Professional
    "enterprise": "price_1TrlFxDXs4xycz0ofyuV70Rf"      # $499/mo Enterprise
}

class CheckoutRequest(BaseModel):
    plan_type: str
    user_id: Optional[str] = None
    email: Optional[str] = None

@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    """
    Spins up a secure Stripe Checkout Session in Hosted Redirection mode.
    """
    plan = request.plan_type.lower()
    
    if plan not in PRICE_TIER_MAPPING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type '{request.plan_type}'. Must be standard, professional, or enterprise."
        )

    price_id = PRICE_TIER_MAPPING[plan]
    customer_email = request.email or (request.user_id if request.user_id and "@" in request.user_id else None)
    reference_id = request.user_id or request.email or "guest"

    try:
        session_kwargs = {
            "payment_method_types": ["card"],
            "line_items": [
                {
                    "price": price_id,
                    "quantity": 1,
                },
            ],
            "mode": "subscription",
            "client_reference_id": reference_id,
            "metadata": {
                "email": customer_email or "",
                "plan_type": plan,
                "user_id": reference_id
            },
            "success_url": f"{settings.FRONTEND_URL}/return?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{settings.FRONTEND_URL}/?checkout=cancel",
        }

        # Attach customer_email if present
        if customer_email:
            session_kwargs["customer_email"] = customer_email

        checkout_session = stripe.checkout.Session.create(**session_kwargs)

        # Return both keys to guarantee compatibility across frontends
        return {
            "checkout_url": checkout_session.url,
            "url": checkout_session.url
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error during checkout creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error creating checkout session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )

# ====================================================================
# STEP 5: SESSION STATUS VERIFICATION ENDPOINT
# ====================================================================
@router.get("/session-status")
async def get_session_status(session_id: str):
    """
    Retrieves status and customer details for a completed Stripe Checkout Session.
    """
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        customer_email = (
            session.get("customer_details", {}).get("email") or 
            session.get("customer_email") or 
            session.get("metadata", {}).get("email")
        )

        return {
            "status": session.status,          # e.g., 'complete'
            "payment_status": session.payment_status, # e.g., 'paid'
            "customer_email": customer_email,
            "plan_type": session.get("metadata", {}).get("plan_type", "professional")
        }
    except stripe.error.StripeError as e:
        logger.error(f"Error fetching Stripe session status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired Stripe session ID."
        )