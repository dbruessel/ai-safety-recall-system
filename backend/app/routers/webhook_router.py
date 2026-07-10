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