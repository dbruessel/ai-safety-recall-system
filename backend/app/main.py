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
    logger.info("🚀 Starting RECALLLOGIC Enterprise Loss Control System...")
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
        title="RECALLLOGIC — Continuous Risk Defense Platform",
        description="Enterprise Loss Control System",
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

        # Bulletproof table-based template for Outlook, Gmail, and Apple Mail
        html_content = f"""
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Loss-Control Audit Authorization</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060911; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #060911; padding: 30px 15px;">
            <tr>
              <td align="center">
                
                <!-- MAIN CONTAINER (600px Max) -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0C1220; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                  
                  <!-- HEADER BAR -->
                  <tr>
                    <td style="padding: 24px 32px; background-color: #070B14; border-bottom: 1px solid #1e293b;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td>
                            <div style="font-size: 15px; font-weight: 900; letter-spacing: 0.12em; color: #38bdf8; font-family: monospace;">
                              RECALLLOGIC
                            </div>
                            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-top: 3px;">
                              Continuous Risk Defense Platform &bull; Enterprise Loss Control System
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- BODY CONTENT -->
                  <tr>
                    <td style="padding: 32px;">
                      
                      <!-- BADGE -->
                      <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                        <tr>
                          <td style="background-color: #082f49; border: 1px solid #0284c7; padding: 5px 12px; border-radius: 9999px;">
                            <span style="color: #38bdf8; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; font-family: monospace;">
                              🛡️ Pre-Renewal Underwriter Audit
                            </span>
                          </td>
                        </tr>
                      </table>

                      <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; line-height: 1.4; margin: 0 0 16px 0;">
                        Loss-Control Audit Request for {payload.fleet_name}
                      </h1>

                      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                        Hi {payload.recipient_name},
                      </p>

                      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                        <strong style="color: #ffffff;">{payload.broker_name}</strong> has provisioned an Underwriter Loss-Control Audit for your power units in direct support of your <strong style="color: #38bdf8;">{payload.carrier_goal}</strong> objective.
                      </p>

                      <!-- STRUCTURED AUDIT DETAILS CARD -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #070B14; border: 1px solid #1e293b; border-radius: 8px; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td style="padding: 6px 0; color: #64748b; font-size: 12px; font-family: monospace; text-transform: uppercase; width: 40%;">Requesting Broker:</td>
                                <td style="padding: 6px 0; color: #f1f5f9; font-size: 12px; font-weight: bold; font-family: monospace;">{payload.broker_name}</td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; color: #64748b; font-size: 12px; font-family: monospace; text-transform: uppercase;">Target Fleet:</td>
                                <td style="padding: 6px 0; color: #f1f5f9; font-size: 12px; font-weight: bold; font-family: monospace;">{payload.fleet_name}</td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; color: #64748b; font-size: 12px; font-family: monospace; text-transform: uppercase;">Renewal Goal:</td>
                                <td style="padding: 6px 0; color: #34d399; font-size: 12px; font-weight: bold; font-family: monospace;">15% Premium Credit Defense</td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; color: #64748b; font-size: 12px; font-family: monospace; text-transform: uppercase;">Legal Exposure:</td>
                                <td style="padding: 6px 0; color: #f87171; font-size: 12px; font-weight: bold; font-family: monospace;">$250k+ Punitive Liability Defense</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 28px 0;">
                        Operating commercial power units with unaddressed NHTSA safety defects creates uninsurable gross-negligence exposure in accident litigation and prevents carriers from applying maximum renewal credits.
                      </p>

                      <!-- BULLETPROOF BUTTON TABLE (Outlook & Mobile Immune) -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                        <tr>
                          <td align="center">
                            <table border="0" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center" style="border-radius: 8px; background-color: #06B6D4;">
                                  <a href="{onboarding_link}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 800; color: #020617; text-decoration: none; border-radius: 8px; letter-spacing: 0.02em;">
                                    Authorize Read-Only Fleetio Access (60s) &rarr;
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- SECURITY FOOTER -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #1e293b; margin-top: 24px; padding-top: 16px;">
                        <tr>
                          <td style="color: #64748b; font-size: 11px; line-height: 1.5;">
                            🔒 <strong>Enterprise Security:</strong> Read-only access is restricted to VIN inventory and work order status. Zero credit card or software installation required.
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>

                  <!-- COMPLIANCE FOOTER -->
                  <tr>
                    <td style="background-color: #070B14; border-top: 1px solid #1e293b; padding: 18px 32px; text-align: center;">
                      <p style="margin: 0; color: #475569; font-size: 11px; font-family: monospace;">
                        RECALLLOGIC Continuous Risk Defense Platform &bull; Enterprise Loss Control System<br/>
                        Automated NHTSA Compliance &bull; Work Order Sync &bull; Underwriter Evidence Locker
                      </p>
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>

        </body>
        </html>
        """

        try:
            sender_email = os.getenv(
                "BROKER_FROM_EMAIL",
                f"{payload.broker_name} Loss Control <dennis@recalllogic.ai>"
            )
            reply_to_address = os.getenv("RESEND_REPLY_TO", "dennis@recalllogic.ai")

            email_res = resend.Emails.send({
                "from": sender_email,
                "to": [payload.recipient_email],
                "reply_to": reply_to_address,
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
                            "description": "RECALLLOGIC Continuous Risk Defense & Loss-Control System.",
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

        # Format recall table rows for bulletproof rendering
        recall_rows = ""
        for r in payload.recalls:
            recall_rows += f"""
            <div style="background-color: #070B14; border: 1px solid #1e293b; padding: 14px 16px; border-radius: 8px; margin-bottom: 12px;">
              <div style="color: #ffffff; font-weight: 700; font-size: 13px; font-family: monospace;">
                Unit: {r.unit_number} &bull; VIN: {r.vin}
              </div>
              <div style="color: #ef4444; font-weight: 700; font-size: 12px; margin-top: 4px; font-family: monospace;">
                Campaign #{r.campaign_number} &mdash; {r.component}
              </div>
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 8px 0 0 0;">
                {r.summary}
              </p>
            </div>
            """

        upgrade_banner = ""
        if payload.userTier == "standard":
            upgrade_banner = """
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #1e293b; margin-top: 24px; padding-top: 18px;">
              <tr>
                <td style="color: #94a3b8; font-size: 12px; line-height: 1.6;">
                  ⚡ <strong style="color: #ffffff;">Need a Certified Underwriter Evidence Locker for your broker?</strong><br/>
                  <a href="https://recalllogic.ai" style="color: #38bdf8; text-decoration: underline; font-weight: bold;">Upgrade to Professional ($249/mo)</a> to generate instant PDF risk packets and live underwriter access tokens.
                </td>
              </tr>
            </table>
            """

        html_content = f"""
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>RecallLogic Critical Safety Defect Notice</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #060911; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #060911; padding: 30px 15px;">
            <tr>
              <td align="center">
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0C1220; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                  
                  <!-- HEADER BAR -->
                  <tr>
                    <td style="padding: 24px 32px; background-color: #070B14; border-bottom: 1px solid #1e293b;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td>
                            <div style="font-size: 15px; font-weight: 900; letter-spacing: 0.12em; color: #38bdf8; font-family: monospace;">
                              RECALLLOGIC
                            </div>
                            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-top: 3px;">
                              Continuous Risk Defense Platform &bull; Enterprise Loss Control System
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- BODY CONTENT -->
                  <tr>
                    <td style="padding: 32px;">
                      
                      <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                        <tr>
                          <td style="background-color: #450a0a; border: 1px solid #b91c1c; padding: 5px 12px; border-radius: 9999px;">
                            <span style="color: #f87171; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; font-family: monospace;">
                              🚨 Safety Critical Alert
                            </span>
                          </td>
                        </tr>
                      </table>

                      <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">
                        Critical Safety Defect Notice
                      </h1>

                      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                        Our continuous NHTSA synchronization identified active, safety-critical recall campaigns requiring immediate shop remediation across your registered power units:
                      </p>

                      <div style="margin: 20px 0;">
                        {recall_rows}
                      </div>

                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                        <tr>
                          <td align="center">
                            <table border="0" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center" style="border-radius: 8px; background-color: #06B6D4;">
                                  <a href="https://recalllogic.ai" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 800; color: #020617; text-decoration: none; border-radius: 8px;">
                                    Open Operations Workspace &rarr;
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      {upgrade_banner}

                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="background-color: #070B14; border-top: 1px solid #1e293b; padding: 18px 32px; text-align: center;">
                      <p style="margin: 0; color: #475569; font-size: 11px; font-family: monospace;">
                        RECALLLOGIC Continuous Risk Defense Platform &bull; Enterprise Loss Control System<br/>
                        Automated NHTSA Compliance &bull; Work Order Sync &bull; Underwriter Evidence Locker
                      </p>
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>

        </body>
        </html>
        """

        try:
            sender_email = os.getenv(
                "RESEND_FROM_EMAIL",
                "RecallLogic Continuous Risk Defense <dennis@recalllogic.ai>"
            )
            reply_to_address = os.getenv("RESEND_REPLY_TO", "dennis@recalllogic.ai")

            params = {
                "from": sender_email,
                "to": [payload.email],
                "reply_to": reply_to_address,
                "subject": f"🚨 [Safety Notice] {len(payload.recalls)} New Safety Defect(s) Detected",
                "html": html_content,
            }
            email_res = resend.Emails.send(params)
            return {"status": "success", "data": email_res}
        except Exception as e:
            logger.error(f"Failed to dispatch safety digest to {payload.email}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    return app


app = create_app()