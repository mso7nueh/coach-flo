# Coach Fit Backend API

Backend API для приложения Coach Fit на FastAPI.

## Возможности

- ✅ Регистрация и авторизация для клиентов и тренеров
- ✅ Подтверждение телефона через SMS код
- ✅ Онбординг для обеих ролей
- ✅ JWT аутентификация
- ✅ Связь клиентов с тренерами через код подключения
- ✅ PostgreSQL база данных
- ✅ Docker для легкого развертывания

## Быстрый старт с Docker (Рекомендуется)

### Требования
- Docker
- Docker Compose

### Запуск

1. Клонируйте репозиторий и перейдите в папку `backend`

2. Запустите через Docker Compose:
```bash
docker-compose up -d
```

Это запустит:
- PostgreSQL базу данных на порту 5432
- FastAPI приложение на порту 8000

3. API будет доступен по адресу: http://localhost:8000
4. Документация API (Swagger): http://localhost:8000/docs
5. Альтернативная документация (ReDoc): http://localhost:8000/redoc

### Остановка

```bash
docker-compose down
```

### Просмотр логов

```bash
docker-compose logs -f backend
```

### Пересборка после изменений

```bash
docker-compose up -d --build
```

## Локальная установка (без Docker)

### Требования
- Python 3.11+
- PostgreSQL 15+

### Установка

1. Создайте виртуальное окружение:
```bash
python -m venv venv
```

2. Активируйте виртуальное окружение:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Установите зависимости:
```bash
pip install -r requirements.txt
```

### Настройка

1. Создайте файл `.env` в корне папки `backend` на основе `.env.example`:

```env
POSTGRES_USER=coachfit
POSTGRES_PASSWORD=coachfit
POSTGRES_DB=coachfit
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://coachfit:coachfit@localhost:5432/coachfit
SECRET_KEY=your-secret-key-change-in-production-please-use-strong-random-key
```

2. Создайте базу данных PostgreSQL:
```bash
createdb coachfit
```

### Запуск

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API будет доступен по адресу: http://localhost:8000

Документация API: http://localhost:8000/docs

## API Endpoints

### Авторизация

- `POST /api/auth/register/step1` - Регистрация (шаг 1: создание пользователя и отправка SMS)
- `POST /api/auth/register/step2` - Регистрация (шаг 2: подтверждение SMS кода)
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/send-sms` - Отправка SMS кода
- `POST /api/auth/verify-sms` - Проверка SMS кода
- `GET /api/auth/me` - Получить информацию о текущем пользователе

### Онбординг

- `POST /api/onboarding/complete` - Завершить онбординг
- `GET /api/onboarding/` - Получить данные онбординга

### Пользователи

- `GET /api/users/me` - Получить информацию о текущем пользователе

## Структура проекта

```
backend/
├── app/
│   ├── __init__.py
│   ├── database.py          # Настройка базы данных
│   ├── models.py            # SQLAlchemy модели
│   ├── schemas.py           # Pydantic схемы
│   ├── auth.py              # JWT и аутентификация
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py          # Роуты авторизации
│   │   ├── onboarding.py    # Роуты онбординга
│   │   └── users.py         # Роуты пользователей
│   └── services/
│       ├── __init__.py
│       └── sms_service.py   # Сервис отправки SMS
├── main.py                  # Точка входа приложения
├── requirements.txt        # Зависимости
└── README.md               # Документация
```

## Процесс регистрации

1. **Шаг 1**: Клиент отправляет данные регистрации (имя, email, пароль, телефон, роль, код тренера)
   - Создается пользователь в БД (но телефон не подтвержден)
   - Отправляется SMS код на телефон
   
2. **Шаг 2**: Клиент отправляет телефон и SMS код
   - Проверяется код
   - Телефон помечается как подтвержденный
   - Возвращается JWT токен

## Процесс онбординга

После регистрации клиент может пройти онбординг, указав:
- Вес, рост, возраст
- Цели (похудение, набор массы и т.д.)
- Уровень активности
- Ограничения

Тренеры пропускают онбординг автоматически.

## SMS сервис

В текущей версии SMS коды выводятся в консоль. Для продакшена необходимо:
1. Зарегистрироваться у SMS провайдера (Twilio, SMS.ru и т.д.)
2. Обновить функцию `send_sms_code` в `app/services/sms_service.py`

## База данных

Используется PostgreSQL 15. База данных создается автоматически при первом запуске через Docker Compose.

### Миграции

Таблицы создаются автоматически при первом запуске приложения. Для продакшена рекомендуется использовать Alembic для управления миграциями.

### Подключение к БД

При использовании Docker Compose:
- Host: `localhost` (извне контейнера) или `db` (изнутри контейнера)
- Port: `5432`
- Database: `coachfit`
- User: `coachfit`
- Password: `coachfit`

## Деплой на VPS

### Подготовка

1. Установите Docker и Docker Compose на сервере
2. Скопируйте файлы проекта на сервер
3. Создайте `.env` файл с продакшен настройками:
   - Измените `SECRET_KEY` на сильный случайный ключ
   - Настройте `POSTGRES_PASSWORD` на безопасный пароль
   - Настройте `CORS_ORIGINS` для вашего домена

### Запуск

```bash
docker-compose up -d
```

### Обновление

```bash
git pull
docker-compose up -d --build
```

### Рекомендации для продакшена

1. Используйте reverse proxy (Nginx) перед приложением
2. Настройте SSL сертификаты (Let's Encrypt)
3. Используйте переменные окружения для секретов
4. Настройте резервное копирование базы данных
5. Настройте мониторинг и логирование
6. Интегрируйте реальный SMS сервис

