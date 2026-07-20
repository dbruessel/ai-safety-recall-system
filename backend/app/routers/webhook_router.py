import logging
import stripe
from fastapi import APIRouter, Request, Header, HTTPException, status
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger("webhook-router")
router = APIRouter(prefix="/payments", tags=["webhooks"])

# Map your new Stripe Price IDs to the corresponding RecallLogic tiers
# TODO: Replace these placeholder IDs with the actual Price IDs from your Stripe Dashboard
PRICE_TIER_MAPPING = {
    "price_1TrlFTDXs4xycz0o1e9gfg9d": "standard",       # $99/mo
    "price_1TsR6jDXs4xycz0ohAfewQgk": "professional",   # $249/mo
    "price_1TrlFxDXs4xycz0ofyuV70Rf": "enterprise"      # $499/mo
}

@router.post("/webhook")
async def stripe_webhook_listener(request: Request, stripe_signature: str = Header(None)):
    """
    Asynchronously processes signed incoming Stripe webhooks.
    Upgrades paid fleet tiers in Supabase to 'standard', 'professional', or 'enterprise' 
    upon successful subscription based on the Stripe Price ID [cite: 48].
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing required signature header.")
        
    payload = await request.body()
    
    try:
        # Verify the webhook signature to ensure it actually came from Stripe
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle successful checkout sessions
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Expand the session to retrieve the specific line items (what they bought)
        session_with_items = stripe.checkout.Session.retrieve(
            session['id'],
            expand=['line_items']
        )
        
        customer_email = session.get("customer_details", {}).get("email")
        
        if customer_email and session_with_items.line_items:
            # Grab the Stripe Price ID from the first item in the cart
            purchased_price_id = session_with_items.line_items.data.price.id
            
            # Map the Price ID to your tier string, defaulting to 'standard' if unmatched
            assigned_tier = PRICE_TIER_MAPPING.get(purchased_price_id, "standard")
            
            # Initialize Supabase client
            sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)
            
            try:
                # UPDATE: Replace the old is_pro boolean with the specific string tier [cite: 48]
                sb.table("profiles").update({"tier": assigned_tier}).eq("email", customer_email).execute()
                logger.info(f"Successfully upgraded user {customer_email} to {assigned_tier} tier.")
            except Exception as db_err:
                logger.error(f"Supabase update failed for {customer_email}: {str(db_err)}")
                
    return {"status": "success"}