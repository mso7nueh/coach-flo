from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

router = APIRouter()


@router.post("/", response_model=schemas.PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment: schemas.PaymentCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать платеж (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут создавать платежи")
    
    # Проверяем, что клиент существует и связан с тренером
    client = db.query(models.User).filter(
        and_(
            models.User.id == payment.client_id,
            models.User.trainer_id == current_user.id
        )
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден или не связан с вами")
    
    payment_id = str(uuid.uuid4())
    
    # Вычисляем дату следующего платежа для подписки
    next_payment_date = None
    if payment.type == models.PaymentType.SUBSCRIPTION and payment.subscription_days:
        next_payment_date = payment.date + timedelta(days=payment.subscription_days)
    
    remaining_sessions = None
    if payment.type == models.PaymentType.PACKAGE and payment.package_size:
        remaining_sessions = payment.package_size
    
    db_payment = models.Payment(
        id=payment_id,
        trainer_id=current_user.id,
        client_id=payment.client_id,
        amount=payment.amount,
        date=payment.date,
        type=payment.type,
        package_size=payment.package_size,
        remaining_sessions=remaining_sessions,
        subscription_days=payment.subscription_days,
        next_payment_date=next_payment_date,
        notes=payment.notes
    )
    db.add(db_payment)
    
    # Обновляем данные клиента
    if payment.type == models.PaymentType.PACKAGE and payment.package_size:
        if client.workouts_package is None:
            client.workouts_package = 0
        client.workouts_package += payment.package_size
        # Если есть дата сгорания и она в будущем, возможно стоит продлить?
        # Пока просто добавляем количество.
        
    elif payment.type == models.PaymentType.SUBSCRIPTION and payment.subscription_days:
        # Если подписка активна, продлеваем её
        now = datetime.now().astimezone()
        if client.subscription_expires_at and client.subscription_expires_at > now:
            client.subscription_expires_at += timedelta(days=payment.subscription_days)
        else:
            # Иначе начинаем новую с момента оплаты (или с указанной даты, если она в будущем? обычно с момента оплаты)
            # В данном коде payment.date используется как дата платежа.
            # Если payment.date < now, это может быть внесение прошлого платежа.
            # Логично продлевать от текущего момента или от payment.date?
            # Если вносим исторический платеж, то от payment.date.
            start_date = payment.date if payment.date else now
            client.subscription_expires_at = start_date + timedelta(days=payment.subscription_days)
            
    db.commit()
    db.refresh(db_payment)
    return db_payment


@router.get("/", response_model=List[schemas.PaymentResponse])
async def get_payments(
    client_id: Optional[str] = Query(None, description="ID клиента"),
    start_date: Optional[datetime] = Query(None, description="Начало периода"),
    end_date: Optional[datetime] = Query(None, description="Конец периода"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список платежей (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать платежи")
    
    query = db.query(models.Payment).filter(
        models.Payment.trainer_id == current_user.id
    )
    
    if client_id:
        query = query.filter(models.Payment.client_id == client_id)
    if start_date:
        query = query.filter(models.Payment.date >= start_date)
    if end_date:
        query = query.filter(models.Payment.date <= end_date)
    
    payments = query.order_by(models.Payment.date.desc()).all()
    return payments


@router.get("/stats")
async def get_finance_stats(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить статистику по финансам (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать статистику")
    
    # Месячная выручка
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_revenue = db.query(func.sum(models.Payment.amount)).filter(
        and_(
            models.Payment.trainer_id == current_user.id,
            models.Payment.date >= current_month_start
        )
    ).scalar() or 0
    
    # Общая выручка
    total_revenue = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.trainer_id == current_user.id
    ).scalar() or 0
    
    # Средний чек
    payment_count = db.query(func.count(models.Payment.id)).filter(
        models.Payment.trainer_id == current_user.id
    ).scalar() or 0
    average_check = total_revenue / payment_count if payment_count > 0 else 0
    
    return {
        "monthly_revenue": float(monthly_revenue),
        "total_revenue": float(total_revenue),
        "average_check": float(average_check),
        "total_payments": payment_count
    }


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить платеж (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут удалять платежи")
    
    payment = db.query(models.Payment).filter(
        and_(
            models.Payment.id == payment_id,
            models.Payment.trainer_id == current_user.id
        )
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")
    
    db.delete(payment)
    db.commit()
    return None

