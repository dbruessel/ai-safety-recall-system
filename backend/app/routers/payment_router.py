import logging
import os
import stripe
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.config import get_settings

# Initialize Logger
logger = logging.getLogger("payment-router")

# Retrieve Global SaaS Configurations
try:
    settings = get_settings()
except Exception:
    # Fallback import if settings singleton is uninstantiated
    from app.config import settings

# Initialize Stripe API Client with Private Secret Key
stripe.api_key = settings.STRIPE_SECRET_KEY

# Register payments route group
router = APIRouter(prefix="/payments", tags=["payments"])

# Define mapping for product tiers to actual Stripe Price IDs 
# (Make sure to replace these placeholder IDs with your actual Stripe Dashboard Price IDs)
PRICE_TIER_MAPPING = {
    "standard": "price_1TrlFTDXs4xycz0o1e9gfg9d",      # $99/mo Standard
    "professional": "price_1TsR6jDXs4xycz0ohAfewQgk",   # $249/mo Professional
    "enterprise": "price_1TrlFxDXs4xycz0ofyuV70Rf"      # $499/mo Enterprise
}

class CheckoutRequest(BaseModel):
    plan_type: str  # Must be "standard", "professional", or "enterprise"
    user_id: str    # The user email or database ID to link this checkout session

@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    """
    Spins up a secure Stripe Checkout Session in Hosted Redirection mode.
    """
    plan = request.plan_type.lower()
    if plan not in STRIPE_PRICE_IDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type '{request.plan_type}'. Must be standard, professional, or enterprise."
        )

    price_id = STRIPE_PRICE_IDS[plan]

    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                },
            ],
            mode="subscription",
            client_reference_id=request.user_id,
            success_url=f"{settings.FRONTEND_URL}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/pricing",
        )
        return {"checkout_url": checkout_session.url}
        
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