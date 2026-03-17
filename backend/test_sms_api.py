import os
import httpx
from dotenv import load_dotenv

# Загружаем переменные из .env файла
load_dotenv()

def test_telegram():
    print("--- Тестируем Telegram Gateway ---")
    token = os.getenv("TG_GATEWAY_TOKEN")
    if not token:
        print("Ошибка: TG_GATEWAY_TOKEN не задан")
        return
        
    phone = input("Введите ваш номер телефона (в формате +79991234567): ")
    
    url = "https://gatewayapi.telegram.org/sendVerificationMessage"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "phone_number": phone,
        "code": "1234",
        "ttl": 60
    }
    
    response = httpx.post(url, headers=headers, json=data)
    print(f"Статус ответ: {response.status_code}")
    print(f"Тело ответа: {response.json()}")

def test_smsc():
    print("--- Тестируем SMSC.ru ---")
    apikey = os.getenv("SMSC_API_KEY")
    if not apikey:
        print("Ошибка: SMSC_API_KEY не задан")
        return
        
    phone = input("Введите ваш номер телефона (в формате 79991234567): ")
    
    url = "https://smsc.ru/sys/send.php"
    params = {
        "login": "", # Пусто для apikey
        "psw": apikey,
        "phones": phone,
        "mes": "Тест Coach Fit: 1234",
        "fmt": 3
    }
    
    response = httpx.get(url, params=params)
    print(f"Статус ответ: {response.status_code}")
    print(f"Тело ответа: {response.json()}")

if __name__ == "__main__":
    choice = input("Что тестировать? (1 - Telegram, 2 - SMSC.ru): ")
    if choice == "1":
        test_telegram()
    elif choice == "2":
        test_smsc()
    else:
        print("Неверный выбор")
