import os
from typing import List, Optional
from dotenv import load_dotenv

# Load environment variables from .env immediately before app configs are initialized
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import resend
import stripe

from app.config import init_vertex, get_settings
from app.services.pdf_report import router as pdf_router

# Explicitly import all system and feature routers
from app.routers import (
    audit_router,
    metrics,
    batches,
    vins,
    upload,
    recalls,
    webhook_router,
    dashboard_router,
    sandbox,
    payment_router,
    stripe_router,
)

# Initialize Vertex AI before application construction if configured
init_vertex()

# Configure API Keys
resend.api_key = os.getenv("RESEND_API_KEY")
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Price ID Mapping (Falls back to standard/pro/enterprise keys or price aliases)
STRIPE_PRICE_MAP = {
    "standard": os.getenv("STRIPE_PRICE_STANDARD", "price_1P_standard_default"),
    "professional": os.getenv("STRIPE_PRICE_PROFESSIONAL", "price_1P_pro_default"),
    "enterprise": os.getenv("STRIPE_PRICE_ENTERPRISE", "price_1P_enterprise_default"),
}

# ==========================================
# ALERT DIGEST DATA MODELS & ENDPOINT
# ==========================================
class RecallItem(BaseModel):
    unit_number: Optional[str] = "UNASSIGNED"
    vin: str
    campaign_number: str
    component: str
    summary: str

class AlertDigestRequest(BaseModel):
    email: str
    userTier: Optional[str] = "standard"
    recalls: List[RecallItem]

# ==========================================
# STRIPE PAYLOAD MODELS
# ==========================================
class StripePortalRequest(BaseModel):
    email: Optional[str] = None
    customer_email: Optional[str] = None
    return_url: Optional[str] = "https://recalllogic.ai"

class StripeCheckoutRequest(BaseModel):
    email: Optional[str] = None
    customer_email: Optional[str] = None
    tier: Optional[str] = "professional"
    price_id: Optional[str] = None
    success_url: Optional[str] = "https://recalllogic.ai?checkout=success"
    cancel_url: Optional[str] = "https://recalllogic.ai?checkout=cancel"

def create_app() -> FastAPI:
    """
    Application factory to initialize and configure the central FastAPI backend.
    """
    settings = get_settings()
    
    app = FastAPI(
        title="RecallLogic Backend",
        version="2026.4.2"
    )

    # Configure CORS middleware with production origins
    origins = [
        "https://recalllogic.ai",
        "https://www.recalllogic.ai",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    if hasattr(settings, "frontend_origin") and settings.frontend_origin:
        origins.append(settings.frontend_origin)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ==========================================
    # REGISTER ALL ROUTERS UNDER THE /api PREFIX
    # ==========================================
    app.include_router(metrics.router, prefix="/api")
    app.include_router(batches.router, prefix="/api")
    app.include_router(vins.router, prefix="/api")
    app.include_router(upload.router, prefix="/api")
    app.include_router(recalls.router, prefix="/api")
    app.include_router(webhook_router.router, prefix="/api")
    app.include_router(dashboard_router.router, prefix="/api")
    app.include_router(sandbox.router, prefix="/api")
    app.include_router(payment_router.router, prefix="/api")
    app.include_router(stripe_router.router)
    app.include_router(pdf_router)
    app.include_router(audit_router.router)

    # ==========================================
    # ROBUST STRIPE BILLING PORTAL ENDPOINT
    # Auto-creates/fetches customer to avoid 400 Bad Request
    # ==========================================
    @app.post("/api/stripe/create-portal-session")
    async def create_portal_session(payload: StripePortalRequest):
        target_email = payload.email or payload.customer_email or "admin@fleet.com"

        try:
            # 1. Search for existing Stripe customer by email
            customers = stripe.Customer.list(email=target_email, limit=1)
            
            if customers.data:
                customer_id = customers.data[0].id
            else:
                # 2. Auto-provision customer profile if absent
                new_customer = stripe.Customer.create(
                    email=target_email,
                    description=f"Fleet Customer ({target_email})"
                )
                customer_id = new_customer.id

            # 3. Create Stripe Billing Portal Session
            return_link = payload.return_url or "https://recalllogic.ai"
            session = stripe.billingPortal.Session.create(
                customer=customer_id,
                return_url=return_link
            )
            return {"url": session.url, "status": "success"}

        except Exception as e:
            print(f"⚠️ Stripe Portal Error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Stripe Portal Generation Failed: {str(e)}")

    # ==========================================
    # ROBUST STRIPE CHECKOUT SESSION ENDPOINT
    # Handles tier mapping and pre-filled customer emails
    # ==========================================
    @app.post("/api/stripe/create-checkout-session")
    async def create_checkout_session(payload: StripeCheckoutRequest):
        target_email = payload.email or payload.customer_email or "admin@fleet.com"
        target_tier = (payload.tier or "professional").lower()

        # Determine Price ID
        price_id = payload.price_id or STRIPE_PRICE_MAP.get(target_tier, STRIPE_PRICE_MAP["professional"])

        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                customer_email=target_email,
                line_items=[
                    {
                        "price_data": {
                            "currency": "usd",
                            "product_data": {
                                "name": f"RecallLogic Fleet Safety ({target_tier.title()} Tier)",
                                "description": "Automated NHTSA recall monitoring & underwriter compliance certification.",
                            },
                            "unit_amount": 24900 if target_tier == "professional" else 9900 if target_tier == "standard" else 49900,
                            "recurring": {"interval": "month"},
                        },
                        "quantity": 1,
                    },
                ],
                mode="subscription",
                success_url=payload.success_url or "https://recalllogic.ai?checkout=success",
                cancel_url=payload.cancel_url or "https://recalllogic.ai?checkout=cancel",
            )
            return {"url": checkout_session.url, "sessionId": checkout_session.id}

        except Exception as e:
            print(f"⚠️ Stripe Checkout Error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Stripe Checkout Session Failed: {str(e)}")

    # ==========================================
    # RECALL RISK ALERT DIGEST ROUTE
    # ==========================================
    @app.post("/api/alerts/send-digest")
    async def send_recall_digest(payload: AlertDigestRequest):
        if not payload.recalls:
            return {"status": "skipped", "message": "No actionable recalls to report."}

        # Format recall HTML list
        recall_rows = ""
        for r in payload.recalls:
            recall_rows += f"""
            <div style="background-color: #070B14; border: 1px solid #1e293b; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
              <strong style="color: #ffffff;">Unit: {r.unit_number} ({r.vin})</strong><br/>
              <span style="color: #ef4444; font-weight: bold;">Campaign #{r.campaign_number}</span> — {r.component}<br/>
              <p style="color: #94a3b8; font-size: 11px; margin-top: 6px; margin-bottom: 0;">{r.summary}</p>
            </div>
            """

        # Add Pro upgrade banner for Standard tier users
        upgrade_banner = ""
        if payload.userTier == "standard":
            upgrade_banner = """
            <hr style="border-color: #1e293b; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 11px;">
              ⚡ <strong>Need a Signed Underwriter Compliance Certificate for your broker?</strong><br/>
              <a href="https://recalllogic.ai" style="color: #06B6D4;">Upgrade to Professional ($249/mo)</a> to generate instant PDF risk packets and shareable broker links.
            </p>
            """

        html_content = f"""
        <div style="font-family: monospace; background-color: #0B0F17; color: #f1f5f9; padding: 24px; border-radius: 12px;">
          <h2 style="color: #06B6D4; margin-top: 0;">RecallLogic Safety Alert</h2>
          <p style="color: #94a3b8; font-size: 13px;">Our automated NHTSA sync detected active safety recalls on your registered fleet units:</p>
          
          <div style="margin: 20px 0;">
            {recall_rows}
          </div>

          <a href="https://recalllogic.ai" style="display: inline-block; background-color: #06B6D4; color: #020617; font-weight: bold; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 12px;">Open Operations Workspace</a>
          
          {upgrade_banner}
        </div>
        """

        try:
            params = {
                "from": "RecallLogic Safety <onboarding@resend.dev>",
                "to": [payload.email],
                "subject": f"🚨 [Safety Alert] {len(payload.recalls)} New Safety Recall(s) Detected",
                "html": html_content,
            }
            email_res = resend.Emails.send(params)
            return {"status": "success", "data": email_res}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return app

# Expose app instance for Uvicorn
app = create_app()