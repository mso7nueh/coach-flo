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


def normalize_phone(phone: str) -> str:
    """Нормализует номер телефона: оставляет только цифры"""
    return "".join(filter(str.isdigit, phone))


import os
from smsaero import SmsAero, SmsAeroException

def send_sms_code(phone: str, code: str) -> bool:
    """
    Отправляет SMS код на телефон используя сервис SMS Aero.
    """
    email = os.getenv("SMSAERO_EMAIL")
    api_key = os.getenv("SMSAERO_API_KEY")
    
    # Очистка номера телефона (оставляем только цифры)
    clean_phone = normalize_phone(phone)
    
    print(f"[SMS] Отправка кода {code} на номер {clean_phone}")
    
    if not email or not api_key:
        print("[SMS] WARNING: SMSAERO_EMAIL or SMSAERO_API_KEY not set. SMS not sent.")
        return True

    try:
        api = SmsAero(email, api_key)
        result = api.send_sms(int(clean_phone), f"Код подтверждения Coach Fit: {code}")
        # SMS Aero возвращает словарь с 'id' и 'status' (без ключа 'success')
        # Статусы 1-8 означают что сообщение принято (в т.ч. на модерации)
        if result and result.get('id'):
            print(f"[SMS] Сообщение принято провайдером: {result}")
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
    # Нормализуем телефон перед сохранением
    normalized_phone = normalize_phone(phone)
    code = generate_sms_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)  # Код действителен 10 минут
    
    # Удаляем старые неиспользованные верификации для этого номера
    db.query(models.SMSVerification).filter(
        models.SMSVerification.phone == normalized_phone,
        models.SMSVerification.verified == False
    ).delete()
    
    sms_verification = models.SMSVerification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        phone=normalized_phone,
        code=code,
        expires_at=expires_at,
        verified=False
    )
    
    db.add(sms_verification)
    db.commit()
    db.refresh(sms_verification)
    
    # Отправляем SMS
    send_sms_code(normalized_phone, code)
    
    return sms_verification


def verify_sms_code(db: Session, phone: str, code: str) -> bool:
    """Проверяет SMS код"""
    # Нормализуем телефон для поиска
    normalized_phone = normalize_phone(phone)
    
    # Находим последнюю неиспользованную верификацию для этого номера
    sms_verification = (
        db.query(models.SMSVerification)
        .filter(
            models.SMSVerification.phone == normalized_phone,
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












