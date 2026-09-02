import os
import stripe
from fastapi import APIRouter, Request, HTTPException, Header
from supabase import create_client, Client

router = APIRouter(prefix="/api/stripe", tags=["stripe"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


def get_supabase_admin() -> Client:
    """Helper to lazily initialize Supabase Admin Client."""
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="Supabase credentials missing from backend environment variables."
        )

    return create_client(url, key)


@router.post("/create-checkout-session")
async def create_checkout_session(data: dict):
    try:
        tier = data.get("tier", "professional").lower()
        company_name = data.get("company_name", "My Fleet Co.")
        success_url = data.get("success_url")
        cancel_url = data.get("cancel_url")

        price_map = {
            "standard": os.getenv("VITE_STRIPE_PRICE_STANDARD") or os.getenv("STRIPE_PRICE_STANDARD"),
            "professional": os.getenv("VITE_STRIPE_PRICE_PRO") or os.getenv("STRIPE_PRICE_PRO"),
            "enterprise": os.getenv("VITE_STRIPE_PRICE_ENTERPRISE") or os.getenv("STRIPE_PRICE_ENTERPRISE"),
        }

        price_id = price_map.get(tier, price_map.get("professional"))

        if not price_id:
            raise HTTPException(status_code=400, detail=f"No Stripe Price ID configured for tier '{tier}'.")

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            metadata={
                "tier": tier,
                "company_name": company_name,
            },
            success_url=success_url,
            cancel_url=cancel_url,
        )

        return {"url": session.url, "sessionId": session.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle successful subscription purchases
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        
        customer_email = session.get("customer_details", {}).get("email") or session.get("customer_email")
        stripe_customer_id = session.get("customer")
        stripe_subscription_id = session.get("subscription")
        
        metadata = session.get("metadata", {})
        tier = metadata.get("tier", "professional").lower()
        company_name = metadata.get("company_name", "My Fleet Co.")

        # Define vehicle capacity limits per paid tier
        tier_vehicle_limits = {
            "standard": 50,
            "professional": 250,
            "enterprise": 10000,
        }
        vehicle_limit = tier_vehicle_limits.get(tier, 50)

        if customer_email:
            supabase_admin = get_supabase_admin()

            # 1. Upsert Organization
            org_res = supabase_admin.table("organizations").upsert(
                {"name": company_name, "subscription_tier": tier},
                on_conflict="name"
            ).execute()
            
            org_id = org_res.data[0]["id"] if org_res.data else None

            # 2. Update Profile to ACTIVE (clears 'trial' and default limits)
            supabase_admin.table("profiles").update({
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_id": stripe_subscription_id,
                "subscription_status": "active",  # Explicitly replaces 'trial'
                "status": "active",               # Marks account active
                "subscription_tier": tier,
                "vehicle_limit": vehicle_limit,   # Sets 50 for standard, 250 for pro, etc.
                "company_name": company_name,
                "organization_id": org_id,
            }).eq("email", customer_email).execute()

            print(f"✅ Webhook successfully provisioned active {tier} tier ({vehicle_limit} VINs) for {customer_email}")

    return {"status": "success"}