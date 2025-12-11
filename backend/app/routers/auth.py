from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.services.sms_service import create_sms_verification, verify_sms_code
from datetime import timedelta
import uuid
import string

router = APIRouter()


@router.post(
    "/send-sms",
    response_model=schemas.VerifySMSResponse,
    summary="Отправить SMS код",
    description="""
    Отправляет 4-значный SMS код на указанный номер телефона.
    
    Код действителен в течение 10 минут.
    
    **В режиме разработки код выводится в консоль сервера.**
    """,
    responses={
        200: {
            "description": "SMS код успешно отправлен",
            "content": {
                "application/json": {
                    "example": {
                        "verified": False,
                        "message": "SMS код отправлен"
                    }
                }
            }
        },
        500: {"description": "Ошибка отправки SMS"}
    }
)
async def send_sms_code_endpoint(
    request: schemas.SendSMSRequest,
    db: Session = Depends(get_db)
):
    """Отправляет SMS код на телефон"""
    try:
        create_sms_verification(db, request.phone)
        return schemas.VerifySMSResponse(
            verified=False,
            message="SMS код отправлен"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка отправки SMS: {str(e)}"
        )


@router.post(
    "/verify-sms",
    response_model=schemas.VerifySMSResponse,
    summary="Проверить SMS код",
    description="""
    Проверяет SMS код, отправленный на телефон.
    
    Код должен быть введен в течение 10 минут после отправки.
    """,
    responses={
        200: {
            "description": "Код подтвержден",
            "content": {
                "application/json": {
                    "example": {
                        "verified": True,
                        "message": "Телефон подтвержден"
                    }
                }
            }
        },
        400: {"description": "Неверный код или код истек"}
    }
)
async def verify_sms_code_endpoint(
    request: schemas.VerifySMSRequest,
    db: Session = Depends(get_db)
):
    """Проверяет SMS код"""
    is_valid = verify_sms_code(db, request.phone, request.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код или код истек"
        )
    return schemas.VerifySMSResponse(
        verified=True,
        message="Телефон подтвержден"
    )


@router.post(
    "/register/step1",
    response_model=schemas.VerifySMSResponse,
    summary="Регистрация (Шаг 1)",
    description="""
    Первый шаг регистрации пользователя.
    
    Создает пользователя в системе и отправляет SMS код на указанный телефон.
    
    **Процесс регистрации:**
    1. Вызовите этот эндпоинт с данными пользователя
    2. Получите SMS код (в разработке - в консоли сервера)
    3. Вызовите `/register/step2` с кодом для завершения регистрации
    
    **Роли:**
    - `client` - клиент (требует онбординг после регистрации)
    - `trainer` - тренер (онбординг пропускается автоматически)
    
    **Код тренера:**
    - Для клиентов можно указать `trainer_code` для связи с тренером
    - Для тренеров код подключения генерируется автоматически
    """,
    responses={
        200: {
            "description": "Пользователь создан, SMS код отправлен",
            "content": {
                "application/json": {
                    "example": {
                        "verified": False,
                        "message": "SMS код отправлен на ваш телефон"
                    }
                }
            }
        },
        400: {
            "description": "Пользователь уже существует или неверный код тренера"
        }
    }
)
async def register_step1(
    request: schemas.RegisterStep1Request,
    db: Session = Depends(get_db)
):
    """Шаг 1 регистрации: создание пользователя и отправка SMS"""
    # Проверяем, существует ли пользователь с таким email
    existing_user = db.query(models.User).filter(models.User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )
    
    # Проверяем, существует ли пользователь с таким телефоном
    if request.phone:
        existing_phone = db.query(models.User).filter(models.User.phone == request.phone).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким телефоном уже существует"
            )
    
    # Проверяем код тренера, если это клиент
    trainer_id = None
    if request.role == models.UserRole.CLIENT and request.trainer_code:
        trainer = db.query(models.User).filter(
            models.User.trainer_connection_code == request.trainer_code,
            models.User.role == models.UserRole.TRAINER
        ).first()
        if not trainer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный код тренера"
            )
        trainer_id = trainer.id
    
    # Создаем пользователя (пока не подтвержден телефон)
    user_id = str(uuid.uuid4())
    user = models.User(
        id=user_id,
        full_name=request.full_name,
        email=request.email,
        phone=request.phone,
        hashed_password=get_password_hash(request.password),
        role=request.role,
        trainer_id=trainer_id,
        phone_verified=False,
        onboarding_seen=request.role == models.UserRole.TRAINER  # Тренеры пропускают онбординг
    )
    
    # Генерируем код подключения для тренера
    if request.role == models.UserRole.TRAINER:
        import random
        import string as string_module
        code = ''.join(random.choices(string_module.ascii_uppercase + string_module.digits, k=8))
        user.trainer_connection_code = code
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Отправляем SMS код
    if request.phone:
        create_sms_verification(db, request.phone, user_id)
    
    return schemas.VerifySMSResponse(
        verified=False,
        message="SMS код отправлен на ваш телефон"
    )


@router.post(
    "/register/step2",
    response_model=schemas.RegisterResponse,
    summary="Регистрация (Шаг 2)",
    description="""
    Второй шаг регистрации - подтверждение SMS кода.
    
    После успешной верификации кода:
    - Телефон помечается как подтвержденный
    - Возвращается JWT токен для аутентификации
    - Возвращается информация о пользователе
    
    **Токен:**
    Используйте полученный токен в заголовке `Authorization: Bearer <token>` для доступа к защищенным эндпоинтам.
    
    **Онбординг:**
    Если `requires_onboarding: true`, пользователю нужно пройти онбординг через `/api/onboarding/complete`.
    """,
    responses={
        200: {
            "description": "Регистрация завершена успешно",
            "content": {
                "application/json": {
                    "example": {
                        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "user": {
                            "id": "uuid-here",
                            "full_name": "Иван Иванов",
                            "email": "ivan@example.com",
                            "phone": "+7 (999) 123-45-67",
                            "role": "client",
                            "onboarding_seen": False,
                            "locale": "ru",
                            "phone_verified": True,
                            "created_at": "2024-01-01T00:00:00"
                        },
                        "requires_onboarding": True
                    }
                }
            }
        },
        400: {"description": "Неверный код или код истек"},
        404: {"description": "Пользователь не найден"}
    }
)
async def register_step2(
    request: schemas.RegisterStep2Request,
    db: Session = Depends(get_db)
):
    """Шаг 2 регистрации: подтверждение SMS кода и завершение регистрации"""
    # Проверяем код
    is_valid = verify_sms_code(db, request.phone, request.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код или код истек"
        )
    
    # Находим пользователя по телефону
    user = db.query(models.User).filter(models.User.phone == request.phone).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Помечаем телефон как подтвержденный
    user.phone_verified = True
    db.commit()
    db.refresh(user)
    
    # Создаем токен
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    # Формируем ответ
    user_response = schemas.UserResponse.model_validate(user)
    
    return schemas.RegisterResponse(
        token=access_token,
        user=user_response,
        requires_onboarding=not user.onboarding_seen
    )


@router.post(
    "/login",
    response_model=schemas.LoginResponse,
    summary="Вход в систему",
    description="""
    Авторизация пользователя по email и паролю.
    
    После успешного входа возвращается JWT токен и информация о пользователе.
    
    **Использование токена:**
    Добавьте токен в заголовок запросов:
    ```
    Authorization: Bearer <your_token>
    ```
    """,
    responses={
        200: {
            "description": "Успешный вход",
            "content": {
                "application/json": {
                    "example": {
                        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "user": {
                            "id": "uuid-here",
                            "full_name": "Иван Иванов",
                            "email": "ivan@example.com",
                            "phone": "+7 (999) 123-45-67",
                            "role": "client",
                            "onboarding_seen": True,
                            "locale": "ru",
                            "phone_verified": True,
                            "created_at": "2024-01-01T00:00:00"
                        }
                    }
                }
            }
        },
        401: {"description": "Неверный email или пароль"}
    }
)
async def login(
    request: schemas.LoginRequest,
    db: Session = Depends(get_db)
):
    """Авторизация пользователя"""
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    user_response = schemas.UserResponse.model_validate(user)
    
    return schemas.LoginResponse(
        token=access_token,
        user=user_response
    )


@router.get(
    "/me",
    response_model=schemas.UserResponse,
    summary="Текущий пользователь",
    description="""
    Получить информацию о текущем аутентифицированном пользователе.
    
    **Требуется аутентификация:** Да (JWT токен)
    """,
    responses={
        200: {
            "description": "Информация о пользователе",
            "content": {
                "application/json": {
                    "example": {
                        "id": "uuid-here",
                        "full_name": "Иван Иванов",
                        "email": "ivan@example.com",
                        "phone": "+7 (999) 123-45-67",
                        "role": "client",
                        "onboarding_seen": True,
                        "locale": "ru",
                        "phone_verified": True,
                        "created_at": "2024-01-01T00:00:00"
                    }
                }
            }
        },
        401: {"description": "Не авторизован"}
    }
)
async def get_current_user_info(
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить информацию о текущем пользователе"""
    return schemas.UserResponse.model_validate(current_user)

