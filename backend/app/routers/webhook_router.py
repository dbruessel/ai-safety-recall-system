import logging
import stripe
from fastapi import APIRouter, Request, Header, HTTPException, status
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger("webhook-router")
router = APIRouter(prefix="/payments", tags=["webhooks"])

# Map your Stripe Price IDs to the corresponding RecallLogic tiers
PRICE_TIER_MAPPING = {
    "price_1TrlFTDXs4xycz0o1e9gfg9d": "standard",      # $199/mo Standard
    "price_1TsR6jDXs4xycz0ohAfewQgk": "professional",   # $499/mo Professional
    "price_1TrlFxDXs4xycz0ofyuV70Rf": "enterprise"      # Custom Enterprise
}

@router.post("/webhook")
async def stripe_webhook_listener(request: Request, stripe_signature: str = Header(None)):
    """
    Asynchronously processes signed incoming Stripe webhooks.
    Upgrades paid fleet tiers in Supabase to 'standard', 'professional', or 'enterprise' 
    upon successful subscription based on the Stripe Price ID.
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing required signature header.")
        
    payload = await request.body()
    
    try:
        # Verify the webhook signature to ensure it came from Stripe
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle successful checkout sessions
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        try:
            # Expand the session to retrieve the specific line items securely
            session_with_items = stripe.checkout.Session.retrieve(
                session['id'],
                expand=['line_items']
            )
            
            customer_email = session.get("customer_details", {}).get("email")
            line_items_data = getattr(session_with_items.line_items, "data", [])
            
            if customer_email and len(line_items_data) > 0:
                # FIXED: Access the first element of the line items list safely
                purchased_price_id = line_items_data[0].price.id
                
                # Map the Price ID to your tier string, defaulting to 'standard' if unmatched
                assigned_tier = PRICE_TIER_MAPPING.get(purchased_price_id, "standard")
                
                # Initialize Supabase client
                sb: Client = create_client(settings.supabase_url, settings.supabase_service_key)
                
                # Update the profile record in Supabase to reflect active subscription tier
                sb.table("profiles").update({"tier": assigned_tier}).eq("email", customer_email).execute()
                logger.info(f"Successfully upgraded user {customer_email} to {assigned_tier} tier.")
            else:
                logger.warning(f"Checkout session {session.get('id')} completed without customer email or line items.")
                
        except Exception as err:
            logger.error(f"Failed to process checkout.session.completed: {str(err)}")
            raise HTTPException(status_code=500, detail="Internal webhook processing error.")
                
    return {"status": "success"}