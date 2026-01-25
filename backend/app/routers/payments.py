from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.models import User
from pydantic import BaseModel
from typing import Optional
from yookassa import Configuration, Payment
import uuid
import logging
import datetime

# Configure YooKassa
# TODO: Move to env variables
Configuration.account_id = '1252826'
Configuration.secret_key = 'test_dwD370CJbR4smcZTspBVq2CuTo2LgkoHpvKSeI8YOLM'

router = APIRouter()
logger = logging.getLogger(__name__)

class PaymentCreateRequest(BaseModel):
    amount: float
    description: str
    plan_id: str

class PaymentCreateResponse(BaseModel):
    payment_id: str
    confirmation_token: str
    status: str

@router.post("/create", response_model=PaymentCreateResponse)
async def create_payment(
    request: PaymentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Создание платежа в ЮKassa
    """
    try:
        idempotency_key = str(uuid.uuid4())
        payment = Payment.create({
            "amount": {
                "value": str(request.amount),
                "currency": "RUB"
            },
            "confirmation": {
                "type": "embedded"
            },
            "capture": True,
            "description": f"{request.description} (User: {current_user.email})",
            "metadata": {
                "user_id": current_user.id,
                "plan_id": request.plan_id
            },
            "receipt": {
                "customer": {
                    "email": current_user.email
                },
                "items": [
                    {
                        "description": request.description,
                        "quantity": "1.00",
                        "amount": {
                            "value": str(request.amount),
                            "currency": "RUB"
                        },
                        "vat_code": "1",
                        "payment_mode": "full_payment",
                        "payment_subject": "service"
                    }
                ]
            }
        }, idempotency_key)

        # Update user with last payment id (temporary tracking)
        current_user.yookassa_payment_id = payment.id
        
        # NOTE: In a real production app, we should use Webhooks to verify payment success
        # For this implementation, we assume if they started it, we might check status later
        # OR we just rely on the frontend success callback to trigger a check.
        # But wait, subscription update logic should happen on success.
        
        # Since we use 'embedded', frontend handles the flow.
        # We need a webhook to know when it's 'succeeded' to update DB: subscription_expires_at
        
        # For "demo" purposes and simplicity requested:
        # We will optimistically assume success or add a 'check' endpoint the frontend calls after widget success.
        
        db.commit()

        return {
            "payment_id": payment.id,
            "confirmation_token": payment.confirmation.confirmation_token,
            "status": payment.status
        }

    except Exception as e:
        logger.error(f"Error creating payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check", response_model=dict)
async def check_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Проверка статуса платежа и активация подписки если оплачено
    """
    try:
        payment = Payment.find_one(payment_id)
        if payment.status == 'succeeded':
            # Activate subscription
            days = 30
            # From metadata we can know which plan, for now assumming 30 days based on earlier prompt
            plan_id = payment.metadata.get('plan_id', 'unknown')
            
            # Update user subscription
            now = datetime.datetime.now(datetime.timezone.utc)
            
            # If already active, extend? Or reset?
            # Let's simple reset for now or extend if future
            if current_user.subscription_expires_at and current_user.subscription_expires_at > now:
                 current_user.subscription_expires_at += datetime.timedelta(days=days)
            else:
                 current_user.subscription_expires_at = now + datetime.timedelta(days=days)
            
            current_user.subscription_plan = plan_id
            db.commit()
            
            return {"status": "succeeded", "message": "Subscription activated"}
            
        return {"status": payment.status}
    except Exception as e:
        logger.error(f"Error checking payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
