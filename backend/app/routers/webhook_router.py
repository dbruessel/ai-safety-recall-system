import os
import stripe
from fastapi import APIRouter, Request, Header, HTTPException
from app.config import settings

router = APIRouter(prefix="/payments", tags=["webhooks"])
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    # 1. Get raw request body (Required for signature verification)
    raw_body = await request.body()
    
    # 2. Verify signature
    try:
        event = stripe.Webhook.construct_event(
            payload=raw_body,
            sig_header=stripe_signature,
            secret=settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 3. Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        customer_email = session.get("customer_details", {}).get("email")
        
        # TODO: Implement your database logic here
        # Example: 
        # db.users.update_one(
        #     {"email": customer_email}, 
        #     {"$set": {"subscription_status": "pro"}}
        # )
        print(f"Successfully processed payment for {customer_email}")

    return {"status": "success"}