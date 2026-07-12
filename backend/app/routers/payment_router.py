import logging
import stripe
from fastapi import APIRouter, Request, Header, HTTPException, status
from pydantic import BaseModel
from supabase import create_client, Client
from app.config import settings

# Setup structured module logging
logger = logging.getLogger("payment-router")

# Initialize Stripe and Supabase clients with workspace settings
stripe.api_key = settings.STRIPE_SECRET_KEY
supabase_client: Client = create_client(settings.supabase_url, settings.supabase_service_key)

router = APIRouter(prefix="/payments", tags=["payments"])

# Price ID Mapping - Maps front-end subscription plans to your active Stripe dashboard products
# Replace these with your real price IDs from Stripe (e.g., 'price_1Pabc123XYZ')
PRICE_MAP = {
    "starter": "price_starter_99_flat_id",         # Starter: Up to 15 assets ($99/mo)
    "professional": "price_professional_249_flat_id", # Growth/Professional: Up to 100 assets ($249/mo)
    "enterprise": "price_enterprise_499_flat_id"     # Scale/Enterprise: Unlimited assets ($499/mo)
}


class CheckoutRequest(BaseModel):
    plan_type: str  # "starter", "professional", or "enterprise"
    user_id: str    # The Supabase profile ID (UUID) to link to this subscription


@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    """
    Spins up a secure, Stripe Embedded Checkout Session on the backend.
    Passes client_reference_id to associate the completed subscription with the correct Supabase user.
    """
    if request.plan_type not in PRICE_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type '{request.plan_type}'. Must be one of: {list(PRICE_MAP.keys())}"
        )

    try:
        # Create an Embedded Checkout Session in subscription mode
        session = stripe.checkout.Session.create(
            ui_mode="embedded",
            mode="subscription",
            payment_method_types=["card"],
            line_items=[
                {
                    "price": PRICE_MAP[request.plan_type],
                    "quantity": 1,
                }
            ],
            client_reference_id=request.user_id,
            # Vite frontend will listen to this callback on successful payment
            return_url=f"{settings.FRONTEND_URL}/return?session_id={{CHECKOUT_SESSION_ID}}",
            metadata={
                "plan_type": request.plan_type,
                "supabase_user_id": request.user_id
            }
        )

        logger.info(f"Created checkout session {session.id} for user {request.user_id}")
        return {"clientSecret": session.client_secret}

    except stripe.error.StripeError as e:
        logger.error(f"Stripe session creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe API Error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected checkout session error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate secure checkout process."
        )


@router.get("/session-status")
async def get_session_status(session_id: str):
    """
    Retrieves the actual payment status and session details for the frontend success callback page.
    This lets the user know immediately if their payment cleared.
    """
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required query parameter: 'session_id'"
        )

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "status": session.status,
            "payment_status": session.payment_status,
            "customer_email": session.customer_details.email if session.customer_details else None,
            "plan_type": session.metadata.get("plan_type")
        }
    except stripe.error.StripeError as e:
        logger.error(f"Failed to retrieve Stripe session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}"
        )


@router.post("/webhook")
async def stripe_webhook_listener(request: Request, stripe_signature: str = Header(None)):
    """
    Secure Webhook Listener: Acts on Stripe server-to-server notifications.
    Verifies signatures to prevent spoofing and upgrades/downgrades user subscription tiers in Supabase.
    """
    if not stripe_signature:
        logger.warning("Webhook request missing Stripe-Signature header")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required signature header."
        )

    # Read the raw request body to verify the cryptographic signature
    payload = await request.body()
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, webhook_secret
        )
    except ValueError:
        logger.error("Invalid raw webhook payload received")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload.")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Webhook signature verification failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signature mismatch.")

    event_type = event["type"]
    logger.info(f"Processing Stripe Webhook Event: {event_type}")

    # =====================================================================
    # CASE 1: Checkout Session Completed (New Subscriptions)
    # =====================================================================
    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id")
        plan_type = session.get("metadata", {}).get("plan_type", "starter")
        stripe_subscription_id = session.get("subscription")
        stripe_customer_id = session.get("customer")

        if not user_id:
            logger.error("Checkout completed but client_reference_id (Supabase User ID) was not found.")
            return {"status": "ignored", "error": "Missing client_reference_id"}

        try:
            logger.info(f"Provisioning subscription '{plan_type}' for user ID {user_id}")
            
            # Upgrade user tier and bind their stripe IDs in Supabase profiles table.
            # Using Supabase Service Role Key bypasses normal RLS write restrictions.
            db_response = supabase_client.table("profiles").update({
                "tier": plan_type,
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_id": stripe_subscription_id,
                "status": "active"
            }).eq("id", user_id).execute()

            logger.info(f"Successfully upgraded user {user_id} to plan {plan_type} in database.")
            return {"status": "success", "provisioned": True}

        except Exception as e:
            logger.error(f"Failed to synchronize subscription to database for user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database sync error during user provisioning."
            )

    # =====================================================================
    # CASE 2: Subscription Canceled / Expired
    # =====================================================================
    elif event_type in ["customer.subscription.deleted", "customer.subscription.updated"]:
        subscription = event["data"]["object"]
        
        # If deleted, downgrade user back to free trial
        if event_type == "customer.subscription.deleted":
            stripe_customer_id = subscription.get("customer")
            try:
                logger.info(f"Revoking subscription tier for customer {stripe_customer_id}")
                supabase_client.table("profiles").update({
                    "tier": "free",
                    "status": "canceled"
                }).eq("stripe_customer_id", stripe_customer_id).execute()

                return {"status": "success", "revoked": True}
            except Exception as e:
                logger.error(f"Failed to revoke tier in database for Stripe customer {stripe_customer_id}: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database sync error during plan cancellation."
                )

    # Acknowledge other event types with a clean 200 OK
    return {"status": "acknowledged", "event_type": event_type}
