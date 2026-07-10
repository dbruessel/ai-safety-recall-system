import logging
import stripe
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.config import settings

logger = logging.getLogger("payment-router")

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/payments", tags=["payments"])

# =====================================================================
# REQUEST SCHEMAS
# =====================================================================
class CheckoutRequest(BaseModel):
    plan_type: str  # "starter", "professional", or "enterprise" [cite: 21, 65]
    user_id: str    # The Supabase profile ID to link this checkout [cite: 29]

# =====================================================================
# ENDPOINT: CREATE EMBEDDED CHECKOUT SESSION
# =====================================================================
@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    """
    Spins up a secure Stripe Checkout Session in embedded mode [cite: 1, 66].
    Injects the user's database ID as a client reference token [cite: 5].
    """
    # 🔑 MAP YOUR SANDBOX FLAT-RATE PRICE IDs HERE:
    price_map = {
        "starter": "price_starter_99_flat_id",         # Up to 15 vehicles [cite: 21]
        "professional": "price_professional_249_flat_id", # 16 to 100 vehicles [cite: 21]
        "enterprise": "price_enterprise_499_flat_id"     # 101+ vehicles [cite: 21]
    }
    
    price_id = price_map.get(request.plan_type.lower())
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid RecallLogic subscription tier requested."
        )

    try:
        # Create a clean flat-rate subscription session [cite: 2, 66]
        session = stripe.checkout.Session.create(
            ui_mode='embedded', # Keeps the customer on your local domain [cite: 1, 66]
            client_reference_id=request.user_id, # Passes database context to webhook [cite: 5]
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            return_url=f"{settings.FRONTEND_URL}/return?session_id={{CHECKOUT_SESSION_ID}}", [cite: 66]
        )
        return {"clientSecret": session.client_secret} [cite: 66]
    except Exception as e:
        logger.error(f"Stripe Session Creation Failure: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) [cite: 66]
2. 📡 The Backend Webhook: backend/app/routers/webhook_router.py
This route handles Stripe’s asynchronous server-to-server notifications [cite: 117]. When a payment clears, it reads the client_reference_id (the user's database profile ID) [cite: 5] and automatically upgrades their account status in Supabase so their full workspace instantly unlocks [cite: 4, 29]!
import logging
import stripe
from fastapi import APIRouter, Request, Header, HTTPException, status
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger("webhook-router")

router = APIRouter(prefix="/payments", tags=["webhooks"])

@router.post("/webhook")
async def stripe_webhook_listener(request: Request, stripe_signature: str = Header(None)):
    """
    Asynchronously processes signed incoming Stripe webhooks [cite: 4, 13].
    Upgrades paid fleet tiers in Supabase upon successful subscription [cite: 4, 29].
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing required signature header.")

    raw_body = await request.body() [cite: 13]
    
    try:
        # Verify event authenticity using your local webhook secret key [cite: 4, 13]
        event = stripe.Webhook.construct_event(
            raw_body, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        ) [cite: 13]
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature verification: {str(e)}")
        raise HTTPException(status_code=400, detail="Cryptographic verification failed.")
    except Exception as e:
        logger.error(f"Webhook body processing failure: {str(e)}")
        raise HTTPException(status_code=400, detail="Bad payload parser format.")

    # Intercept transaction completion events [cite: 4, 13]
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        
        user_id = session.get("client_reference_id") # Resolves who made the purchase [cite: 5]
        stripe_customer_id = session.get("customer")
        stripe_subscription_id = session.get("subscription")

        if not user_id:
            logger.error("Ignored Event: checkout.session.completed missing client_reference_id metadata.")
            return {"status": "ignored", "reason": "No user ID link attached."}

        # Query the exact price ID associated with the transaction to determine their plan
        try:
            line_items = stripe.checkout.Session.list_line_items(session["id"])
            price_id = line_items["data"]["price"]["id"]
        except Exception as e:
            logger.error(f"Failed to extract product price lineage: {str(e)}")
            price_id = None

        # Determine tier matching your database conventions [cite: 21, 29]
        tier = "starter"
        if price_id == "price_professional_249_flat_id":
            tier = "professional"
        elif price_id == "price_enterprise_499_flat_id":
            tier = "enterprise"

        # Update Supabase user profile & activate their workspace permissions [cite: 29]
        try:
            sb: Client = create_client(settings.supabase_url, settings.supabase_service_key) [cite: 49]
            
            # Update user profile tier status [cite: 29]
            sb.table("profiles").update({
                "subscription_tier": tier,
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_id": stripe_subscription_id
            }).eq("id", user_id).execute() [cite: 49]

            logger.info(f"Successfully upgraded user {user_id} to {tier.upper()} status.") [cite: 29]
        except Exception as e:
            logger.error(f"Failed to sync Supabase user profile record: {str(e)}")
            raise HTTPException(status_code=500, detail="Database write operation failed.")

    return {"status": "success"}