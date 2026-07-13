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
    from app.config import settings

# Initialize Stripe API Client with Private Secret Key [cite: 74]
stripe.api_key = settings.STRIPE_SECRET_KEY

# Register payments route group [cite: 74]
router = APIRouter(prefix="/payments", tags=["payments"])

# =====================================================================
# REQUEST SCHEMAS
# =====================================================================
class CheckoutRequest(BaseModel):
    plan_type: str  # Must be "standard", "professional", or "enterprise" [cite: 74]
    user_id: str    # The user email or database ID to link this checkout session [cite: 74]


# =====================================================================
# ENDPOINT: CREATE SECURE STRIPE-HOSTED CHECKOUT SESSION
# =====================================================================
@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    """
    Spins up a secure Stripe Checkout Session in Hosted Redirect mode.
    Binds the local user ID metadata to verify and provision accounts asynchronously [cite: 75].
    """
    logger.info(f"Initiating subscription provisioning for plan: {request.plan_type} (User: {request.user_id})")

    # 🔑 MAP YOUR ACTIVE STRIPE TEST PRICE IDs HERE:
    # Replace these placeholders with your actual 'price_...' keys copied from Stripe Developer Tools!
    price_map = {
        "standard": "price_1TrlFTDXs4xycz0o1e9gfg9d",         # Up to 15 vehicles [cite: 9]
        "professional": "price_1TsR6jDXs4xycz0ohAfewQgk", # 16 to 100 vehicles [cite: 9, 75]
        "enterprise": "price_1TrlFxDXs4xycz0ofyuV70Rf"      # 101+ vehicles [cite: 9, 75]
    }

    # Verify selected plan maps to an active pricing tier
    selected_plan = request.plan_type.lower().strip()
    if selected_plan not in price_map:
        logger.error(f"Invalid plan selected: {request.plan_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid pricing tier specified. Supported: {list(price_map.keys())}"
        )

    stripe_price_id = price_map[selected_plan]

    # Prevent execution blocks if price IDs have not been updated yet
    if "your_actual" in stripe_price_id:
        logger.warning("Unconfigured mock price ID placeholder detected. Halting execution.")
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Pricing profiles not configured. Please paste your 'price_...' keys from your Stripe Catalog."
        )

    # 🛡️ DEFENSIVE FRONTEND ORIGIN RESOLUTION:
    frontend_url = getattr(settings, "FRONTEND_ORIGIN", None) or getattr(settings, "FRONTEND_URL", None)
    if not frontend_url:
        frontend_url = os.getenv("FRONTEND_ORIGIN") or os.getenv("FRONTEND_URL") or "http://localhost:5173"
    
    frontend_url = frontend_url.rstrip("/")

    try:
        # Create a Hosted Checkout Session (Default UI Mode is Redirect)
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[
                {
                    "price": stripe_price_id,
                    "quantity": 1,
                }
            ],
            # Anchor client_reference_id to trace payment success back to Supabase profiles [cite: 74, 76]
            client_reference_id=request.user_id,
            # Success redirects back to dashboard with the session ID
            success_url=f"{frontend_url}/?session_id={{CHECKOUT_SESSION_ID}}",
            # Cancel redirects back to the plain dashboard
            cancel_url=f"{frontend_url}/",
        )

        logger.info(f"Stripe Hosted Checkout Session created successfully: {session.id}")
        return {
            "url": session.url,
            "sessionId": session.id
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe Communication Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe Gateway connection failed: {e.user_message or str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during checkout processing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not configure local checkout engine."
        )
