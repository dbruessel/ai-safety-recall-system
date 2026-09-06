import os
import stripe
from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client

router = APIRouter(prefix="/api/stripe", tags=["stripe"])

def get_supabase_admin() -> Client:
    """Helper to lazily initialize Supabase Admin Client."""
    url = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").strip()
    key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or "").strip()

    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="Supabase credentials missing from backend environment variables."
        )

    return create_client(url, key)

class StripeCheckoutRequest(BaseModel):
    email: Optional[str] = None
    customer_email: Optional[str] = None
    tier: Optional[str] = "professional"
    company_name: Optional[str] = "My Fleet Co."
    success_url: Optional[str] = "https://recalllogic.ai?checkout=success"
    cancel_url: Optional[str] = "https://recalllogic.ai?checkout=cancel"

class StripePortalRequest(BaseModel):
    email: Optional[str] = None
    customer_email: Optional[str] = None
    return_url: Optional[str] = "https://recalllogic.ai"

@router.post("/create-checkout-session")
async def create_checkout_session(payload: StripeCheckoutRequest):
    # Dynamically fetch & sanitize API Key inside request to avoid trailing spaces/quotes
    secret_key = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
    if not secret_key:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY is missing on server.")
    stripe.api_key = secret_key

    target_email = (payload.email or payload.customer_email or "admin@fleet.com").strip()
    tier = (payload.tier or "professional").lower().strip()
    company_name = (payload.company_name or "My Fleet Co.").strip()

    # Look up environment price IDs and clean any surrounding whitespace
    price_map = {
        "standard": (os.getenv("STRIPE_PRICE_STANDARD") or os.getenv("VITE_STRIPE_PRICE_STANDARD") or "").strip(),
        "professional": (os.getenv("STRIPE_PRICE_PROFESSIONAL") or os.getenv("STRIPE_PRICE_PRO") or os.getenv("VITE_STRIPE_PRICE_PRO") or "").strip(),
        "enterprise": (os.getenv("STRIPE_PRICE_ENTERPRISE") or os.getenv("VITE_STRIPE_PRICE_ENTERPRISE") or "").strip(),
    }

    price_id = price_map.get(tier)

    try:
        # Search or create customer to ensure session links cleanly
        customers = stripe.Customer.list(email=target_email, limit=1)
        customer_id = customers.data[0].id if customers.data else stripe.Customer.create(email=target_email).id

        if price_id and price_id.startswith("price_"):
            line_items = [{"price": price_id, "quantity": 1}]
        else:
            # Inline price fallback if explicit price_... ID is missing
            tier_amounts = {"standard": 9900, "professional": 24900, "enterprise": 49900}
            line_items = [{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"RecallLogic Fleet Safety ({tier.title()} Tier)",
                        "description": "Automated NHTSA recall monitoring & loss-control portal.",
                    },
                    "unit_amount": tier_amounts.get(tier, 24900),
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }]

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            mode="subscription",
            line_items=line_items,
            metadata={
                "tier": tier,
                "company_name": company_name,
            },
            success_url=payload.success_url or "https://recalllogic.ai?checkout=success",
            cancel_url=payload.cancel_url or "https://recalllogic.ai?checkout=cancel",
        )

        return {"url": session.url, "sessionId": session.id}
    except Exception as e:
        print(f"⚠️ Stripe Checkout Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/create-portal-session")
async def create_portal_session(payload: StripePortalRequest):
    secret_key = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
    if not secret_key:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY is missing on server.")
    stripe.api_key = secret_key

    target_email = (payload.email or payload.customer_email or "").strip()
    if not target_email:
        raise HTTPException(status_code=400, detail="Customer email is required for billing portal.")

    try:
        customers = stripe.Customer.list(email=target_email, limit=1)
        if customers.data:
            customer_id = customers.data[0].id
        else:
            new_customer = stripe.Customer.create(email=target_email)
            customer_id = new_customer.id

        session = stripe.billingPortal.Session.create(
            customer=customer_id,
            return_url=payload.return_url or "https://recalllogic.ai",
        )
        return {"url": session.url}
    except Exception as e:
        print(f"⚠️ Stripe Portal Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    secret_key = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
    if secret_key:
        stripe.api_key = secret_key

    webhook_secret = (os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip()
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        
        customer_email = session.get("customer_details", {}).get("email") or session.get("customer_email")
        stripe_customer_id = session.get("customer")
        stripe_subscription_id = session.get("subscription")
        
        metadata = session.get("metadata", {})
        tier = metadata.get("tier", "professional").lower().strip()
        company_name = metadata.get("company_name", "My Fleet Co.").strip()

        tier_vehicle_limits = {
            "standard": 50,
            "professional": 250,
            "enterprise": 10000,
        }
        vehicle_limit = tier_vehicle_limits.get(tier, 50)

        if customer_email:
            supabase_admin = get_supabase_admin()

            org_res = supabase_admin.table("organizations").upsert(
                {"name": company_name, "subscription_tier": tier},
                on_conflict="name"
            ).execute()
            
            org_id = org_res.data[0]["id"] if org_res.data else None

            supabase_admin.table("profiles").update({
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_id": stripe_subscription_id,
                "subscription_status": "active",
                "status": "active",
                "subscription_tier": tier,
                "vehicle_limit": vehicle_limit,
                "company_name": company_name,
                "organization_id": org_id,
            }).eq("email", customer_email.strip()).execute()

            print(f"✅ Webhook successfully provisioned active {tier} tier ({vehicle_limit} VINs) for {customer_email}")

    return {"status": "success"}