import random
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app import models
from app.database import get_db
import uuid


def generate_sms_code() -> str:
    """Генерирует 4-значный SMS код"""
    # Временно статический код для разработки
    return "1111"


def send_sms_code(phone: str, code: str) -> bool:
    """
    Отправляет SMS код на телефон.
    В продакшене здесь должна быть интеграция с SMS провайдером (Twilio, SMS.ru и т.д.)
    """
    # TODO: Интеграция с реальным SMS сервисом
    print(f"[SMS] Отправка кода {code} на номер {phone}")
    # В разработке просто выводим в консоль
    return True


def create_sms_verification(db: Session, phone: str, user_id: str = None) -> models.SMSVerification:
    """Создает запись о SMS верификации"""
    code = generate_sms_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)  # Код действителен 10 минут
    
    sms_verification = models.SMSVerification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        phone=phone,
        code=code,
        expires_at=expires_at,
        verified=False
    )
    
    db.add(sms_verification)
    db.commit()
    db.refresh(sms_verification)
    
    # Отправляем SMS
    send_sms_code(phone, code)
    
    return sms_verification


def verify_sms_code(db: Session, phone: str, code: str) -> bool:
    """Проверяет SMS код"""
    # Находим последнюю неиспользованную верификацию для этого номера
    sms_verification = (
        db.query(models.SMSVerification)
        .filter(
            models.SMSVerification.phone == phone,
            models.SMSVerification.verified == False,
            models.SMSVerification.expires_at > datetime.utcnow()
        )
        .order_by(models.SMSVerification.created_at.desc())
        .first()
    )
    
    if not sms_verification:
        return False
    
    if sms_verification.code != code:
        return False
    
    # Помечаем как использованный
    sms_verification.verified = True
    db.commit()
    
    return True






