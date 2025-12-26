from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import (
    auth, onboarding, users, workouts, programs, metrics,
    nutrition, finances, clients, exercises, notes, dashboard, settings
)
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Coach Fit API",
    description="""
    ## Backend API для приложения Coach Fit
    
    ### Основные возможности:
    
    * **Авторизация и регистрация** - Регистрация и вход для клиентов и тренеров
    * **Подтверждение телефона** - Верификация через SMS код
    * **Онбординг** - Настройка профиля пользователя (вес, рост, цели и т.д.)
    * **Управление пользователями** - Получение информации о текущем пользователе
    
    ### Процесс регистрации:
    
    1. **POST /api/auth/register/step1** - Сохранение данных регистрации и отправка SMS кода (пользователь НЕ создается)
    2. **POST /api/auth/register/step2** - Подтверждение SMS кода и создание пользователя
    
    ### Роли:
    
    * **client** - Клиент (требует онбординг)
    * **trainer** - Тренер (онбординг пропускается автоматически)
    
    ### Аутентификация:
    
    Все защищенные эндпоинты требуют JWT токен в заголовке:
    ```
    Authorization: Bearer <your_token>
    ```
    """,
    version="1.0.0",
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

