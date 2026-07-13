import logging
import stripe
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.config import get_settings

# Initialize Logger
logger = logging.getLogger("payment-router")

# Retrieve Global SaaS Configurations
settings = get_settings()

# Initialize Stripe API Client with Private Secret Key [cite: 74]
stripe.api_key = settings.STRIPE_SECRET_KEY

# Register payments route group [cite: 74]
router = APIRouter(prefix="/payments", tags=["payments"])

# =====================================================================
# REQUEST SCHEMAS
# =====================================================================
class CheckoutRequest(BaseModel):
    # Aligned with "standard" tier preference instead of "starter" [cite: 74]
    plan_type: str  # Must be "standard", "professional", or "enterprise"
    user_id: str    # The user email or database ID to link this checkout session [cite: 74]


# =====================================================================
# ENDPOINT: CREATE SECURE EMBEDDED CHECKOUT SESSION
# =====================================================================
@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    """
    Spins up a secure Stripe Checkout Session in embedded mode [cite: 75].
    Binds the local user ID metadata to verify and provision accounts asynchronously [cite: 75].
    """
    logger.info(f"Initiating subscription provisioning for plan: {request.plan_type} (User: {request.user_id})")

    # 🔑 MAP YOUR ACTIVE STRIPE TEST PRICE IDs HERE:
    # Replace these placeholders with your actual 'price_...' keys copied from Stripe Developer Tools!
    price_map = {
        "standard": "price_your_actual_standard_price_id_here",         # Up to 15 vehicles
        "professional": "price_your_actual_professional_price_id_here", # 16 to 100 vehicles [cite: 75]
        "enterprise": "price_your_actual_enterprise_price_id_here"      # 101+ vehicles [cite: 75]
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

    try:
        # Create an Embedded Checkout Session with subscription mechanics [cite: 75]
        session = stripe.checkout.Session.create(
            ui_mode="embedded",
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
            # Redirect back to user's dashboard with the unique Stripe session token
            return_url=f"{settings.FRONTEND_ORIGIN}/?session_id={{CHECKOUT_SESSION_ID}}",
        )

        logger.info(f"Stripe Checkout Session created successfully: {session.id}")
        return {
            "clientSecret": session.client_secret,
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
