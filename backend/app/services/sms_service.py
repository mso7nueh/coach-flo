import random
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app import models
from app.database import get_db
import uuid


def generate_sms_code() -> str:
    """Генерирует 4-значный SMS код"""
    return str(random.randint(1000, 9999))


import os
from smsaero import SmsAero, SmsAeroException

def send_sms_code(phone: str, code: str) -> bool:
    """
    Отправляет SMS код на телефон используя сервис SMS Aero.
    """
    email = os.getenv("SMSAERO_EMAIL")
    api_key = os.getenv("SMSAERO_API_KEY")
    
    # Очистка номера телефона (оставляем только цифры)
    clean_phone = "".join(filter(str.isdigit, phone))
    
    print(f"[SMS] Отправка кода {code} на номер {clean_phone}")
    
    if not email or not api_key:
        print("[SMS] WARNING: SMSAERO_EMAIL or SMSAERO_API_KEY not set. SMS not sent.")
        # В разработке возвращаем True, чтобы не блокировать процесс, 
        # но код "1111" уже не будет работать по умолчанию
        return True

    try:
        api = SmsAero(email, api_key)
        # SMS Aero ожидает инт или строку без лишних символов
        result = api.send_sms(int(clean_phone), f"Код подтверждения Coach Fit: {code}")
        if result.get('success'):
            print(f"[SMS] Код успешно отправлен: {result}")
            return True
        else:
            print(f"[SMS] Ошибка отправки: {result}")
            return False
    except SmsAeroException as e:
        print(f"[SMS] Произошла ошибка при отправке через SmsAero: {e}")
        return False
    except Exception as e:
        print(f"[SMS] Непредвиденная ошибка: {e}")
        return False


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











