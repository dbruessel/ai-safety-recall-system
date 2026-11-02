import asyncio
from contextlib import asynccontextmanager
import logging
import os
from typing import List, Optional
from urllib.parse import quote
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
    telematics_router,  # Telematics & Webhooks router for Phase 2
    fleetio_sync,       # Fleetio 2-Way Sync & Webhook Router
)

logger = logging.getLogger("uvicorn.error")

# Initialize Vertex AI before application construction if configured
init_vertex()

# Configure API Keys
resend.api_key = os.getenv("RESEND_API_KEY")
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Price ID Mapping (Falls back to standard/pro/enterprise keys or price aliases)
STRIPE_PRICE_MAP = {
    "standard": os.getenv("STRIPE_PRICE_STANDARD"),
    "professional": os.getenv("STRIPE_PRICE_PROFESSIONAL"),
    "enterprise": os.getenv("STRIPE_PRICE_ENTERPRISE"),
}


# =====================================================================
# BACKGROUND SAFETY NET SCHEDULER (AUTONOMOUS 6-HOUR SWEEP)
# =====================================================================
async def continuous_risk_defense_loop():
    """
    Autonomous safety net: Audits active fleet assets against newly published
    NHTSA recall campaigns every 6 hours without requiring external cron services.
    Uses asyncio.to_thread to keep the event loop fully non-blocking.
    """
    # Allow container startup, network, and DB pools to settle before initial sweep
    await asyncio.sleep(45)

    while True:
        try:
            logger.info("🛡️ [RECALLLOGIC ENGINE] Initiating scheduled automated fleet safety audit...")
            from app.routers.fleetio_sync import run_fleetio_sync_task
            await asyncio.to_thread(run_fleetio_sync_task)
            logger.info("🛡️ [RECALLLOGIC ENGINE] Scheduled fleet safety audit completed successfully.")
        except Exception as e:
            logger.error(f"⚠️ Scheduled sync error in continuous_risk_defense_loop: {e}", exc_info=True)

        # 6-hour cadence (21,600 seconds)
        await asyncio.sleep(21600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager to start and cleanly cancel background tasks.
    """
    logger.info("🚀 Starting RecallLogic Enterprise Risk Defense Engine...")
    audit_task = asyncio.create_task(continuous_risk_defense_loop())
    yield
    logger.info("🛑 Shutting down background tasks...")
    audit_task.cancel()
    try:
        await audit_task
    except asyncio.CancelledError:
        pass


# ==========================================
# ALERT DIGEST DATA MODELS
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
# BROKER CLIENT INVITATION DATA MODELS
# ==========================================
class BrokerInvitePayload(BaseModel):
    recipient_email: str
    recipient_name: Optional[str] = "Fleet Safety Director"
    fleet_name: str
    broker_name: Optional[str] = "Apex Risk Brokers"
    carrier_goal: Optional[str] = "Travelers Commercial Auto (15% Credit Defense)"


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


# ==========================================
# APPLICATION FACTORY
# ==========================================
def create_app() -> FastAPI:
    """
    Application factory to initialize and configure the central FastAPI backend.
    """
    settings = get_settings()

    app = FastAPI(
        title="RecallLogic Backend",
        version="2026.4.2",
        lifespan=lifespan
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
    app.include_router(telematics_router.router, prefix="/api")
    app.include_router(stripe_router.router)
    app.include_router(pdf_router)
    app.include_router(audit_router.router)
    app.include_router(fleetio_sync.router)

    # ==========================================
    # BROKER 1-CLICK CLIENT INVITATION ROUTE
    # ==========================================
    @app.post("/api/broker/invite-client")
    async def send_broker_client_invite(payload: BrokerInvitePayload):
        encoded_fleet = quote(payload.fleet_name)
        encoded_broker = quote(payload.broker_name or "Apex Risk Brokers")
        onboarding_link = (
            f"https://recalllogic.ai/signup?broker=apex-risk&fleet={encoded_fleet}&broker_name={encoded_broker}"
        )

        html_content = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F17; color: #f1f5f9; padding: 32px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
          <div style="margin-bottom: 20px;">
            <span style="background-color: #082f49; color: #38bdf8; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; border: 1px solid #0369a1; text-transform: uppercase;">
              Underwriter Risk Defense
            </span>
          </div>

          <h2 style="color: #ffffff; margin-top: 0; font-size: 20px; font-weight: 700;">
            Loss-Control Audit Request for {payload.fleet_name}
          </h2>

          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
            Hi {payload.recipient_name},
          </p>

          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            <strong>{payload.broker_name}</strong> has initiated a pre-renewal safety defect audit for your power units in support of your <strong>{payload.carrier_goal}</strong> objective.
          </p>

          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
            Operating power units with unaddressed NHTSA safety recalls creates direct uninsurable corporate exposure in commercial litigation and prevents underwriting carriers from issuing maximum loss-control credits.
          </p>

          <div style="margin: 28px 0; text-align: center;">
            <a href="{onboarding_link}" style="display: inline-block; background-color: #06B6D4; color: #020617; font-weight: 700; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">
              Authorize Read-Only Fleetio Access (60s) →
            </a>
          </div>

          <p style="color: #64748b; font-size: 11px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 16px;">
            🔒 Read-only access is strictly restricted to VIN inventory and work order status. Zero credit card or manual configuration required.
          </p>
        </div>
        """

        try:
            # Uses custom verified domain if provided in environment, otherwise falls back to Resend test sender
            sender_email = os.getenv("RESEND_FROM_EMAIL", "Apex Risk Loss Control <onboarding@resend.dev>")
            
            email_res = resend.Emails.send({
                "from": sender_email,
                "to": [payload.recipient_email],
                "subject": f"Action Required: Authorize Fleetio Access for {payload.fleet_name}",
                "html": html_content,
            })
            logger.info(f"Broker invite successfully sent to {payload.recipient_email}: {email_res}")
            return {"status": "success", "data": email_res}
        except Exception as e:
            logger.error(f"Failed to dispatch broker client invite to {payload.recipient_email}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

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
            logger.error(f"⚠️ Stripe Portal Error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Stripe Portal Generation Failed: {str(e)}")

    # ==========================================
    # ROBUST STRIPE CHECKOUT SESSION ENDPOINT
    # Ensures zero 400 rejection from Stripe API
    # ==========================================
    @app.post("/api/stripe/create-checkout-session")
    async def create_checkout_session(payload: StripeCheckoutRequest):
        target_email = payload.email or payload.customer_email or "admin@fleet.com"
        target_tier = (payload.tier or "professional").lower()

        # Set monthly price tiers ($99 / $249 / $499)
        tier_pricing = {
            "standard": {"amount": 9900, "name": "RecallLogic Standard Tier"},
            "professional": {"amount": 24900, "name": "RecallLogic Professional Tier"},
            "enterprise": {"amount": 49900, "name": "RecallLogic Enterprise Tier"},
        }

        tier_data = tier_pricing.get(target_tier, tier_pricing["professional"])

        try:
            # 1. Search or create customer to ensure session attaches cleanly
            customers = stripe.Customer.list(email=target_email, limit=1)
            customer_id = customers.data[0].id if customers.data else stripe.Customer.create(email=target_email).id

            # 2. Check if a direct price ID exists in env, otherwise fallback to price_data
            env_price_id = STRIPE_PRICE_MAP.get(target_tier)

            if env_price_id and env_price_id.startswith("price_"):
                line_items = [{"price": env_price_id, "quantity": 1}]
            else:
                line_items = [{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": tier_data["name"],
                            "description": "Automated NHTSA recall monitoring & loss-control portal.",
                        },
                        "unit_amount": tier_data["amount"],
                        "recurring": {"interval": "month"},
                    },
                    "quantity": 1,
                }]

            # 3. Create Checkout Session
            checkout_session = stripe.checkout.Session.create(
                customer=customer_id,
                line_items=line_items,
                mode="subscription",
                success_url=payload.success_url or "https://recalllogic.ai?checkout=success",
                cancel_url=payload.cancel_url or "https://recalllogic.ai?checkout=cancel",
            )

            return {"url": checkout_session.url, "sessionId": checkout_session.id}

        except Exception as e:
            logger.error(f"⚠️ Stripe Checkout Error: {str(e)}")
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


app = create_app()