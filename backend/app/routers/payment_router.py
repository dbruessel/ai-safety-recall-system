import stripe
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
# Import your config where you store your STRIPE_SECRET_KEY
from app.config import settings 

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/payments", tags=["payments"])

class CheckoutRequest(BaseModel):
    plan_type: str  # e.g., "pro" or "enterprise"

@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    # Mapping plan types to your Stripe Price IDs
    # Ensure these Price IDs exist in your Stripe Dashboard (Products page)
    price_map = {
        "pro": "price_pro_id_here",
        "enterprise": "price_enterprise_id_here"
    }
    
    price_id = price_map.get(request.plan_type)
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid plan type")

    try:
        # Create a Stripe Checkout Session
        # ui_mode='embedded' is what enables the seamless component inside your app
        session = stripe.checkout.Session.create(
            ui_mode='embedded',
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            return_url=f"{settings.FRONTEND_URL}/return?session_id={{CHECKOUT_SESSION_ID}}",
        )
        return {"clientSecret": session.client_secret}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))