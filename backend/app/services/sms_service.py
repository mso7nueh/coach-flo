import os
import random
import uuid
from datetime import datetime, timedelta
import requests
from sqlalchemy.orm import Session
from app import models

def generate_sms_code() -> str:
    """Генерирует 4-значный код подтверждения"""
    return str(random.randint(1000, 9999))


def normalize_phone(phone: str) -> str:
    """Нормализует номер телефона: оставляет только цифры"""
    return "".join(filter(str.isdigit, phone))


def send_telegram_code(phone: str, code: str) -> bool:
    """
    Отправляет код проверки через официальный Telegram Gateway API.
    """
    token = os.getenv("TG_GATEWAY_TOKEN")
    clean_phone = f"+{normalize_phone(phone)}" # Gateway expects E.164 format with +
    
    print(f"[Telegram Gate] Отправка кода {code} на номер {clean_phone}")
    
    if not token:
        print("[Telegram Gate] WARNING: TG_GATEWAY_TOKEN not set. Telegram message not sent.")
        return True # Return true for local environment without token

    try:
        url = "https://gatewayapi.telegram.org/sendVerificationMessage"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        data = {
            "phone_number": clean_phone,
            "code": code,
            "ttl": 60 # 1 minute expiration aligns with our UI timer
        }
        response = requests.post(url, headers=headers, json=data)
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get("ok"):
            print(f"[Telegram Gate] Сообщение успешно отправлено. Статус: {response_data.get('result', {}).get('delivery_status')}")
            return True
        else:
            print(f"[Telegram Gate] Ошибка отправки: {response.text}")
            return False
            
    except Exception as e:
        print(f"[Telegram Gate] Непредвиденная ошибка: {e}")
        return False


def send_sms_code(phone: str, code: str) -> bool:
    """
    Отправляет SMS код на телефон используя сервис SMSC.ru.
    Вместо логина и пароля используется apikey.
    """
    api_key = os.getenv("SMSC_API_KEY")
    sender = os.getenv("SMSC_SENDER", "CoachFlo")
    
    clean_phone = normalize_phone(phone)
    
    print(f"[SMSC.ru] Отправка кода {code} на номер {clean_phone}, sender={sender}")
    
    if not api_key:
        print("[SMSC.ru] WARNING: SMSC_API_KEY not set. SMS not sent.")
        return True

    try:
        url = "https://smsc.ru/sys/send.php"
        params = {
            "apikey": api_key,
            "phones": clean_phone,
            "mes": f"Kod: {code}",
            "sender": sender,
            "fmt": 3,
            "charset": "utf-8",
            "translit": 1,
        }
        print(f"[SMSC.ru] Параметры запроса: phones={clean_phone}, sender={sender}, translit=1")
        response = requests.get(url, params=params)
        print(f"[SMSC.ru] Ответ API: status={response.status_code}, body={response.text}")
        result = response.json()
        
        if "id" in result and "cnt" in result:
            print(f"[SMSC.ru] Сообщение принято провайдером: {result}")
            return True
        else:
            print(f"[SMSC.ru] Ошибка отправки: {result}")
            return False
    except Exception as e:
        print(f"[SMSC.ru] Непредвиденная ошибка: {e}")
        return False


def create_sms_verification(db: Session, phone: str, user_id: str = None, delivery_method: str = "sms") -> tuple[models.SMSVerification, str]:
    """
    Создает запись о SMS верификации и отправляет код через SMSC.ru.
    """
    normalized_phone = normalize_phone(phone)
    code = generate_sms_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Удаляем старые неиспользованные верификации для этого номера
    db.query(models.SMSVerification).filter(
        models.SMSVerification.phone == normalized_phone,
        models.SMSVerification.verified == False
    ).delete()
    
    # Сохраняем как обычную SMSVerification.
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
    
    # Всегда отправляем через SMSC.ru
    send_sms_code(normalized_phone, code)
    
    return sms_verification, "sms"


def verify_sms_code(db: Session, phone: str, code: str) -> bool:
    """Проверяет SMS код"""
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

