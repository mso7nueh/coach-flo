from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, onboarding, users

# Создаем таблицы
Base.metadata.create_all(bind=engine)

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
    
    1. **POST /api/auth/register/step1** - Создание пользователя и отправка SMS кода
    2. **POST /api/auth/register/step2** - Подтверждение SMS кода и завершение регистрации
    
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
# Дефолтные origins для разработки
default_origins = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
cors_origins_str = os.getenv("CORS_ORIGINS", default_origins)
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["onboarding"])
app.include_router(users.router, prefix="/api/users", tags=["users"])


@app.get("/")
async def root():
    return {"message": "Coach Fit API"}


@app.get("/health")
async def health():
    return {"status": "ok"}

