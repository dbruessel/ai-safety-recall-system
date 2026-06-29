import os
import stripe
from fastapi import APIRouter, Request, Header, HTTPException, status
from app.config import settings

# Preserving your exact prefix configurations to align perfectly with the Stripe CLI testing path: 
# stripe listen --forward-to localhost:8000/payments/webhook
router = APIRouter(prefix="/payments", tags=["webhooks"])

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """
    Production-ready server-to-server webhook destination for Stripe infrastructure.
    Captures completed checkout events to dynamically clear database premium asset limits.
    """
    # Initialize keys based on your unified settings attributes
    stripe.api_key = getattr(settings, "stripe_secret_key", getattr(settings, "STRIPE_SECRET_KEY", None))
    endpoint_secret = getattr(settings, "stripe_webhook_secret", getattr(settings, "STRIPE_WEBHOOK_SECRET", None))
    
    if not stripe.api_key or not endpoint_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe configurations are missing on the server backend."
        )

    # 1. Get raw request body (Required for cryptographic signature verification)
    raw_body = await request.body()
    
    # 2. Verify signature 
    try:
        event = stripe.Webhook.construct_event(
            payload=raw_body,
            sig_header=stripe_signature,
            secret=endpoint_secret
        )
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature verification.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Webhook event construction parsing failure: {str(e)}")

    # 3. Handle the live completion event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        customer_email = session.get("customer_details", {}).get("email")
        client_ref_id = session.get("client_reference_id") # Retrieves user/profile row mapping token
        metadata = session.get("metadata", {})
        vin_count = metadata.get("vinCount", "0")

        print(f"🔄 Stripe event verified. Unlocking Premium access for Email: {customer_email}, Reference ID: {client_ref_id}")

        # 4. Direct Relational Upsert into Supabase
        if client_ref_id:
            try:
                from supabase import create_client, Client
                
                # Fetching credentials from backend context
                sb_url = getattr(settings, "supabase_url", getattr(settings, "SUPABASE_URL", None))
                sb_key = getattr(settings, "supabase_key", getattr(settings, "SUPABASE_KEY", None))
                
                if sb_url and sb_key:
                    supabase: Client = create_client(sb_url, sb_key)
                    
                    # Update the user profile matching the unique client identifier
                    db_response = supabase.table("profiles").update({
                        "is_premium_active": True,
                        "subscription_status": "pro",
                        "max_vin_capacity": int(vin_count) if vin_count.isdigit() and int(vin_count) > 0 else 1000
                    }).eq("id", client_ref_id).execute()
                    
                    print(f"✅ Supabase successfully updated for user {client_ref_id}. Sync status: {db_response.data}")
                else:
                    print("❌ Failure: Supabase environment credentials could not be resolved within the webhook handler loop.")
            except Exception as database_error:
                print(f"❌ Database execution crashed while provisioning webhook permissions: {str(database_error)}")
                # Return 500 so Stripe infrastructure knows to retry the synchronization ping gracefully later
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database storage layer synchronization tracking error."
                )
        else:
            print("⚠️ Warning: checkout.session.completed received but was completely missing a 'client_reference_id' map.")

    return {"status": "success"}