import os
import stripe
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional

# Router prefix aligned with frontend API calls
router = APIRouter(prefix="/stripe", tags=["Stripe Billing"])

# Fetch Stripe API Key from environment
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


class PortalRequest(BaseModel):
    email: str


class CheckoutRequest(BaseModel):
    tier: str
    success_url: str
    cancel_url: str
    email: Optional[str] = None  # Optional: Allows unauthenticated landing page leads to check out directly


def get_stripe_price_id(tier: str) -> str:
    """Helper to resolve Stripe Price IDs from environment variables with safe fallbacks."""
    price_map = {
        "standard": os.getenv("STRIPE_PRICE_STANDARD") or "price_1TrIFTDXs4xycz0o1e9gfg9d",
        "professional": os.getenv("STRIPE_PRICE_PROFESSIONAL") or os.getenv("STRIPE_PRICE_PRO") or "price_1TrIFPRO",
        "enterprise": os.getenv("STRIPE_PRICE_ENTERPRISE") or "price_1TrIFENTERPRISE",
    }
    return price_map.get(tier.lower(), "")


@router.post("/create-portal-session")
async def create_portal_session(req: PortalRequest):
    """
    Creates a hosted Stripe Customer Portal session for managing 
    invoices, payment methods, and receipts.
    """
    try:
        if not stripe.api_key:
            raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY is not configured on the backend.")

        # 1. Search for existing customer in Stripe Sandbox/Live by email
        customers = stripe.Customer.list(email=req.email, limit=1)

        if customers.data:
            customer_id = customers.data[0].id
        else:
            # 2. Automatically provision customer if they don't exist yet
            new_customer = stripe.Customer.create(
                email=req.email,
                description=f"Fleet Operator ({req.email})"
            )
            customer_id = new_customer.id

        # 3. Create Customer Portal Session
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url="http://localhost:5173",
        )
        return {"url": session.url}

    except HTTPException:
        raise
    except stripe.error.StripeError as e:
        print(f"[Stripe Portal Error]: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[Unexpected Server Error]: {e}")
        raise HTTPException(status_code=500, detail="Failed to create portal session.")


@router.post("/create-checkout-session")
async def create_checkout_session(req: CheckoutRequest):
    """
    Creates a Stripe Checkout Session for upgrading or switching subscription tiers.
    """
    try:
        if not stripe.api_key:
            raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY is not configured on the backend.")

        price_id = get_stripe_price_id(req.tier)
        if not price_id:
            raise HTTPException(
                status_code=400, 
                detail=f"No Stripe Price ID configured for tier '{req.tier}'. Check backend environment variables."
            )

        # Look up existing customer if email provided, otherwise let Stripe collect it on checkout
        customer_id = None
        if req.email:
            customers = stripe.Customer.list(email=req.email, limit=1)
            customer_id = customers.data[0].id if customers.data else None

        checkout_kwargs = {
            "payment_method_types": ["card"],
            "line_items": [{"price": price_id, "quantity": 1}],
            "mode": "subscription",
            "success_url": req.success_url,
            "cancel_url": req.cancel_url,
            "metadata": {"tier": req.tier.lower()},
        }

        if req.email:
            checkout_kwargs["metadata"]["email"] = req.email

        if customer_id:
            checkout_kwargs["customer"] = customer_id
        elif req.email:
            checkout_kwargs["customer_email"] = req.email

        session = stripe.checkout.Session.create(**checkout_kwargs)
        return {"url": session.url}

    except HTTPException:
        raise
    except stripe.error.StripeError as e:
        print(f"[Stripe Checkout Error]: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[Unexpected Server Error]: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session.")


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(None)):
    """
    Receives incoming webhook events from Stripe (CLI or Production)
    to process subscription changes automatically.
    """
    payload = await request.body()
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    event = None

    # Verify signature if secret is provided
    if webhook_secret and stripe_signature:
        try:
            event = stripe.Webhook.construct_event(
                payload=payload, sig_header=stripe_signature, secret=webhook_secret
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # Fallback for raw JSON testing if secret isn't provided
        import json
        event = json.loads(payload)

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    print(f"🔔 Received Stripe Webhook Event: {event_type}")

    # Handle successful checkout completion
    if event_type == "checkout.session.completed":
        customer_email = data_object.get("customer_email") or data_object.get("customer_details", {}).get("email")
        tier = data_object.get("metadata", {}).get("tier")
        print(f"✅ Subscription activated! User: {customer_email} | Tier: {tier}")

    elif event_type == "customer.subscription.deleted":
        customer_id = data_object.get("customer")
        print(f"⚠️ Subscription canceled for customer: {customer_id}")

    return {"status": "success"}