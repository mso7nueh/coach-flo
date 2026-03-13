from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import (
    auth, onboarding, users, workouts, programs, metrics,
    nutrition, finances, clients, exercises, notes, dashboard, settings, library, progress_photos, notifications,
    clubs, admin
)
import logging
import os

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Coach Fit API",
    description="""
    ## Backend API для фитнес-приложения Coach Fit
    
    Комплексная платформа для управления тренировками, питанием, метриками и взаимодействия между тренерами и клиентами.
    
    ### 🔐 Аутентификация и авторизация
    
    * **Регистрация** - Двухэтапная регистрация с подтверждением телефона через SMS
    * **Вход** - Авторизация по email и паролю с получением JWT токена
    * **Верификация телефона** - Отправка и проверка SMS кодов
    * **Подключение к тренеру** - Связывание клиентов с тренерами через код подключения
    
    ### 👤 Управление пользователями
    
    * **Профиль пользователя** - Получение и обновление данных профиля
    * **Часовой пояс** - Настройка часового пояса пользователя (IANA Time Zone Database)
    * **Настройки** - Управление локалью, уведомлениями и другими настройками
    * **Роли** - Поддержка ролей: `client` (клиент) и `trainer` (тренер)
    
    ### 📋 Онбординг
    
    * Настройка профиля с указанием физических параметров (вес, рост, возраст)
    * Выбор целей тренировок (похудение, набор массы, выносливость и др.)
    * Указание ограничений и уровня активности
    
    ### 💪 Тренировки
    
    * Создание и управление тренировками
    * Поддержка повторяющихся тренировок (серии)
    * Просмотр истории тренировок с фильтрацией по датам
    * Тренеры могут управлять тренировками своих клиентов
    
    ### 📚 Программы тренировок
    
    * Создание многодневных программ тренировок
    * Управление днями программ (создание, обновление, удаление)
    * **Управление упражнениями в программах** - добавление, обновление и удаление упражнений в блоках дней
    * Просмотр программ для клиентов (тренеры)
    
    ### 📊 Метрики
    
    * **Метрики тела** - Отслеживание веса, объемов, процента жира и других параметров
      * **POST /api/metrics/body** - Создание новой метрики тела
    * **Метрики упражнений** - Запись прогресса по конкретным упражнениям
      * **POST /api/metrics/exercise** - Создание новой метрики упражнения
    * История изменений с возможностью фильтрации по датам
    * Просмотр метрик клиентов (для тренеров)
    
    ### 🍎 Питание
    
    * Ведение дневника питания
    * Отслеживание калорий, белков, жиров, углеводов
    * История записей с фильтрацией по периодам
    
    ### 💰 Финансы (для тренеров)
    
    * Управление платежами клиентов
    * Статистика по доходам
    * Фильтрация по клиентам и периодам
    
    ### 👥 Управление клиентами (для тренеров)
    
    * Список клиентов с поиском
    * Детальная информация о клиентах
    * Статистика клиентов
    * Просмотр и редактирование данных онбординга клиентов
    
    ### 📝 Упражнения
    
    * Библиотека упражнений
    * Создание собственных упражнений с расширенной информацией:
      * Исходное положение и инструкции по выполнению
      * Видео с техникой выполнения (YouTube, Vimeo, Rutube)
      * Заметки и рекомендации
      * Настройка видимости (все клиенты, конкретный клиент, только тренер)
    * Поиск и фильтрация по группам мышц
    * Управление видимостью упражнений для клиентов
    
    ### 📄 Заметки
    
    * Создание заметок к тренировкам и программам
    * Просмотр истории заметок
    
    ### 📚 Библиотека шаблонов тренировок
    
    * **Создание шаблонов** - Тренеры могут создавать переиспользуемые шаблоны тренировок
    * **Управление шаблонами** - Полный CRUD для шаблонов (создание, чтение, обновление, удаление)
    * **Фильтрация** - Поиск шаблонов по уровню сложности, цели, группам мышц, оборудованию
    * **Использование в программах** - Шаблоны можно использовать при создании дней программ
    
    ### 📈 Дашборд
    
    * Общая статистика и аналитика
    * Данные для графиков и отчетов
    * **Цели пользователей** - отображение активных целей с дедлайнами и прогрессом
    * **Фото прогресса** - последние фото для отслеживания изменений
    
    ### 🔄 Процесс регистрации:
    
    1. **POST /api/auth/register/step1** - Сохранение данных регистрации и отправка SMS кода (пользователь НЕ создается)
    2. **POST /api/auth/register/step2** - Подтверждение SMS кода и создание пользователя
    
    ### 🔑 Аутентификация:
    
    Все защищенные эндпоинты требуют JWT токен в заголовке:
    ```
    Authorization: Bearer <your_token>
    ```
    
    Токен получается при успешном входе через `/api/auth/login` и действителен в течение определенного времени.
    
    ### 📚 Дополнительная информация:
    
    * Полный список эндпоинтов доступен в разделе документации ниже
    * Все запросы используют JSON формат
    * API поддерживает CORS для работы с фронтенд приложениями
    * В режиме разработки SMS коды выводятся в консоль сервера
    """,
    version="1.1.0",
    contact={
        "name": "Coach Fit API Support",
    },
    license_info={
        "name": "MIT",
    },
)

# Настройка CORS
import os
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["onboarding"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(workouts.router, prefix="/api/workouts", tags=["workouts"])
app.include_router(programs.router, prefix="/api/programs", tags=["programs"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(nutrition.router, prefix="/api/nutrition", tags=["nutrition"])
app.include_router(finances.router, prefix="/api/finances", tags=["finances"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["exercises"])
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(settings.router, prefix="/api/users/me/settings", tags=["settings"])
app.include_router(library.router, prefix="/api/library", tags=["library"])
app.include_router(library.router, prefix="/api/library", tags=["library"])
app.include_router(progress_photos.router, prefix="/api/progress-photos", tags=["progress-photos"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
from app.routers import payments
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(clubs.router, prefix="/api/clubs", tags=["clubs"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

# Mount static files for uploads
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/")
async def root():
    return {"message": "Coach Fit API"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def startup_event():
    """Создаем таблицы при запуске приложения"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.warning(f"Could not create database tables: {e}")
        logger.warning("Make sure PostgreSQL is running. You can start it with: docker-compose up -d db")

