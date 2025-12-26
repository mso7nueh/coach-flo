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

5. **Запустите базу данных PostgreSQL** (выберите один из вариантов):

   **Вариант A: Использование Docker (рекомендуется)**
   ```bash
   # Убедитесь, что Docker Desktop запущен
   docker-compose up -d db
   ```
   
   **Вариант B: Локальная установка PostgreSQL**
   - Установите PostgreSQL на вашем компьютере
   - Создайте базу данных и пользователя согласно настройкам в `env.example`
   - Или используйте существующую базу данных

6. (Опционально) Создайте файл `.env` на основе `env.example` и настройте переменные окружения:
```bash
cp env.example .env
# Отредактируйте .env при необходимости
```

7. **Выполните миграцию базы данных** (если база данных уже существует):
```bash
python migrate_add_user_fields.py
```
   > ⚠️ Это нужно сделать только если база данных уже была создана до добавления новых полей

8. Запустите сервер:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Тестирование API

После запуска сервера:

- API доступен по адресу: http://localhost:8000
- Документация (Swagger): http://localhost:8000/docs
- Альтернативная документация (ReDoc): http://localhost:8000/redoc

## Примеры запросов

### 1. Регистрация (Шаг 1 - отправка данных и SMS кода)
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

> ⚠️ **ВАЖНО:** 
> - НЕ вызывайте `/api/auth/send-sms` перед регистрацией!
> - Эндпоинт `/register/step1` автоматически отправляет SMS код
> - SMS код выводится в консоль сервера (проверьте консоль!)

### 2. Регистрация (Шаг 2 - подтверждение SMS кода)
```bash
POST http://localhost:8000/api/auth/register/step2
Content-Type: application/json

{
  "phone": "+7 (999) 123-45-67",
  "code": "1234"
}
```

**Примечания**: 
- Используйте тот же телефон, что и в Step 1
- Код из консоли сервера (в режиме разработки)
- Код действителен 10 минут

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

2. **База данных**: Приложение использует PostgreSQL. База данных должна быть запущена перед запуском сервера. Используйте `docker-compose up -d db` для запуска базы данных через Docker, или установите PostgreSQL локально. Таблицы создаются автоматически при первом запуске приложения.

3. **CORS**: Настроен для работы с фронтендом на localhost:5173 и localhost:3000. При необходимости измените в `main.py`.

4. **Секретный ключ**: Для продакшена обязательно измените `SECRET_KEY` в переменных окружения.

## Очистка базы данных

Если нужно очистить базу данных (удалить все данные):

### Вариант 1: Интерактивный скрипт (рекомендуется)
```bash
python clear_database.py
```
Выберите опцию:
- `1` - Очистить данные из всех таблиц (сохранить структуру)
- `2` - Удалить все таблицы и пересоздать их

### Вариант 2: Быстрая очистка (удалить и пересоздать таблицы)
```bash
python clear_db_simple.py
```
Введите `yes` для подтверждения.

### Вариант 2b: Быстрая очистка данных (без пересоздания таблиц)
```bash
python clear_db_quick.py
```
Очищает только данные, сохраняя структуру таблиц.

### Вариант 3: Через SQL (psql)
```sql
-- Подключитесь к базе данных
psql -U your_username -d your_database

-- Удалите все данные
TRUNCATE TABLE users, workouts, training_programs, ... CASCADE;

-- Или удалите все таблицы и пересоздайте их
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

> ⚠️ **ВНИМАНИЕ:** Все данные будут удалены безвозвратно!











