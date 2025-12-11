# Быстрый старт

## Установка и запуск

1. Перейдите в папку backend:
```bash
cd backend
```

2. Создайте виртуальное окружение:
```bash
python -m venv venv
```

3. Активируйте виртуальное окружение:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Установите зависимости:
```bash
pip install -r requirements.txt
```

5. Запустите сервер:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Тестирование API

После запуска сервера:

- API доступен по адресу: http://localhost:8000
- Документация (Swagger): http://localhost:8000/docs
- Альтернативная документация (ReDoc): http://localhost:8000/redoc

## Примеры запросов

### 1. Регистрация (Шаг 1)
```bash
POST http://localhost:8000/api/auth/register/step1
Content-Type: application/json

{
  "full_name": "Иван Иванов",
  "email": "ivan@example.com",
  "password": "password123",
  "phone": "+7 (999) 123-45-67",
  "role": "client",
  "trainer_code": null
}
```

### 2. Регистрация (Шаг 2 - подтверждение SMS)
```bash
POST http://localhost:8000/api/auth/register/step2
Content-Type: application/json

{
  "phone": "+7 (999) 123-45-67",
  "code": "1234"
}
```

**Примечание**: SMS код выводится в консоль сервера при отправке.

### 3. Вход
```bash
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "email": "ivan@example.com",
  "password": "password123"
}
```

### 4. Завершение онбординга
```bash
POST http://localhost:8000/api/onboarding/complete
Authorization: Bearer <ваш_токен>
Content-Type: application/json

{
  "weight": 75.5,
  "height": 180,
  "age": 30,
  "goals": ["weight_loss", "muscle_gain"],
  "restrictions": ["no_dairy"],
  "activity_level": "medium"
}
```

## Важные замечания

1. **SMS коды**: В режиме разработки SMS коды выводятся в консоль сервера. Для продакшена необходимо настроить реальный SMS сервис.

2. **База данных**: По умолчанию используется SQLite. База данных создается автоматически при первом запуске.

3. **CORS**: Настроен для работы с фронтендом на localhost:5173 и localhost:3000. При необходимости измените в `main.py`.

4. **Секретный ключ**: Для продакшена обязательно измените `SECRET_KEY` в переменных окружения.


