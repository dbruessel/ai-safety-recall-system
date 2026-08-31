import os
import stripe
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
from app.config import get_supabase_client

# Router prefix aligned with main.py router registration
router = APIRouter(prefix="/stripe", tags=["Stripe Billing"])


class PortalRequest(BaseModel):
    email: str


class CheckoutRequest(BaseModel):
    tier: str
    success_url: Optional[str] = "https://recalllogic.ai?checkout=success"
    cancel_url: Optional[str] = "https://recalllogic.ai?checkout=cancel"
    email: Optional[str] = None


def get_secret(secret_name: str) -> str:
    """Dynamically fetches secrets from Supabase Vault/RPC, falling back to os.getenv."""
    try:
        supabase = get_supabase_client()
        # RPC function call to read vault secrets if configured in Supabase
        res = supabase.rpc("read_secret", {"secret_name": secret_name}).execute()
        if res.data:
            return res.data
    except Exception as err:
        print(f"⚠️ Vault lookup skipped for {secret_name}: {err}")

    # Fall back to process environment variables
    return os.getenv(secret_name, "")


def get_stripe_price_id(tier: str) -> str:
    """Resolves Stripe Price IDs dynamically from secrets."""
    secret_key = f"STRIPE_PRICE_{tier.upper()}"
    price_id = get_secret(secret_key)
    
    # Check alternate naming convention for Pro tier if applicable
    if not price_id and tier.lower() in ["professional", "pro"]:
        price_id = get_secret("STRIPE_PRICE_PRO")

    if not price_id:
        raise HTTPException(
            status_code=400,
            detail=f"Secret or Environment variable '{secret_key}' was not found in Supabase."
        )
    return price_id


@router.post("/create-portal-session")
async def create_portal_session(req: PortalRequest):
    """
    Creates a hosted Stripe Customer Portal session for managing 
    invoices, payment methods, and receipts.
    """
    stripe_key = get_secret("STRIPE_SECRET_KEY")
    if not stripe_key:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY is missing from Supabase secrets.")
    stripe.api_key = stripe_key

    try:
        customers = stripe.Customer.list(email=req.email, limit=1)

        if customers.data:
            customer_id = customers.data[0].id
        else:
            new_customer = stripe.Customer.create(
                email=req.email,
                description=f"Fleet Operator ({req.email})"
            )
            customer_id = new_customer.id

        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url="https://recalllogic.ai",
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
    stripe_key = get_secret("STRIPE_SECRET_KEY")
    if not stripe_key:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY is missing from Supabase secrets.")
    stripe.api_key = stripe_key

    try:
        price_id = get_stripe_price_id(req.tier)

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
    and executes database updates to Supabase (Organization & Profiles).
    """
    payload = await request.body()
    webhook_secret = get_secret("STRIPE_WEBHOOK_SECRET")
    event_dict = {}

    # 1. Safely parse Stripe Object or raw JSON into a standard Python dict
    try:
        if webhook_secret and stripe_signature:
            stripe_event = stripe.Webhook.construct_event(
                payload=payload, sig_header=stripe_signature, secret=webhook_secret
            )
            event_dict = stripe_event.to_dict() if hasattr(stripe_event, "to_dict") else dict(stripe_event)
        else:
            import json
            event_dict = json.loads(payload)
    except Exception as parse_err:
        print(f"⚠️ Webhook signature/parse fallback ({parse_err}). Reading raw JSON...")
        import json
        event_dict = json.loads(payload)

    # 2. Extract fields safely from dictionary
    event_type = event_dict.get("type")
    data_object = event_dict.get("data", {}).get("object", {})

    print("\n=================== WEBHOOK TRIGGERED ===================")
    print(f"🔔 Event Type: {event_type}")

    # 3. Handle successful checkout completion
    if event_type == "checkout.session.completed":
        customer_id = data_object.get("customer")
        raw_email = data_object.get("customer_email") or (data_object.get("customer_details") or {}).get("email")
        
        customer_email = raw_email or "lasvegas_fleet_test@example.com"
        tier = data_object.get("metadata", {}).get("tier", "professional")

        print(f"👤 Target Email: {customer_email}")
        print(f"🏷️ Tier: {tier} | Stripe Customer ID: {customer_id}")

        try:
            supabase = get_supabase_client()

            # Step A: Look up existing profile to retrieve registered company_name
            profile_query = supabase.table("profiles").select("*").eq("email", customer_email).execute()
            company_name = None
            
            if profile_query.data:
                company_name = profile_query.data[0].get("company_name")

            # Fallback org name generation if company_name is missing/null in profiles
            if not company_name:
                prefix = customer_email.split('@')[0] if '@' in customer_email else "New Fleet"
                company_name = f"{prefix.replace('.', ' ').replace('_', ' ').title()} Co."

            # Step B: Upsert Check — See if Organization already exists
            existing_org = supabase.table("organizations").select("*").eq("name", company_name).execute()

            if existing_org.data:
                # UPDATE existing organization's tier to avoid duplicate rows
                org_id = existing_org.data[0]["id"]
                supabase.table("organizations").update({
                    "subscription_tier": tier
                }).eq("id", org_id).execute()
                print(f"🔄 ORG UPDATED: {company_name} set to tier '{tier}'")
            else:
                # INSERT new organization if it doesn't exist
                supabase.table("organizations").insert({
                    "name": company_name,
                    "subscription_tier": tier,
                }).execute()
                print(f"🚀 ORG CREATED: {company_name}")

            # Step C: Update profile with stripe_customer_id
            if customer_id:
                profile_res = supabase.table("profiles").update({
                    "stripe_customer_id": customer_id
                }).eq("email", customer_email).execute()

                if profile_res.data:
                    print(f"🔗 PROFILE LINKED: Updated stripe_customer_id for {customer_email}")

        except Exception as db_err:
            print(f"❌ SUPABASE DB ERROR: {type(db_err).__name__} - {db_err}")

    elif event_type == "customer.subscription.deleted":
        customer_id = data_object.get("customer")
        print(f"⚠️ Subscription canceled for customer: {customer_id}")

    print("=========================================================\n")
    return {"status": "success"}