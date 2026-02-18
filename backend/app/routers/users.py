from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from pydantic import BaseModel, Field

router = APIRouter()


class LinkTrainerRequest(BaseModel):
    connection_code: str = Field(..., description="Код подключения тренера")


@router.get(
    "/me",
    response_model=schemas.UserWithTrainer,
    summary="Текущий пользователь",
    description="""
    Получить информацию о текущем аутентифицированном пользователе.
    
    Для клиентов также возвращается информация о связанном тренере (если есть).
    
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
                        "created_at": "2024-01-01T00:00:00",
                        "trainer": {
                            "id": "trainer-uuid",
                            "full_name": "Алексей Тренеров",
                            "email": "trainer@example.com",
                            "phone": "+7 (999) 888-77-66",
                            "role": "trainer",
                            "onboarding_seen": True,
                            "locale": "ru",
                            "phone_verified": True,
                            "created_at": "2024-01-01T00:00:00"
                        }
                    }
                }
            }
        },
        401: {"description": "Не авторизован"}
    }
)
async def get_current_user(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить информацию о текущем пользователе"""
    # Перезагружаем пользователя из БД, чтобы получить актуальные данные (включая trainer_id)
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    user_response = schemas.UserResponse.model_validate(user)
    
    # Если это клиент и у него есть тренер, загружаем информацию о тренере
    trainer_response = None
    if user.role == models.UserRole.CLIENT and user.trainer_id:
        # Загружаем тренера из базы данных
        trainer = db.query(models.User).filter(
            models.User.id == user.trainer_id
        ).first()
        if trainer:
            trainer_response = schemas.UserResponse.model_validate(trainer)
        else:
            # Если тренер не найден, но trainer_id установлен - очищаем его
            # Это может произойти, если тренер был удален
            user.trainer_id = None
            db.commit()
            db.refresh(user)
            # Обновляем user_response после очистки trainer_id
            user_response = schemas.UserResponse.model_validate(user)
    
    return schemas.UserWithTrainer(
        **user_response.model_dump(),
        trainer=trainer_response
    )


@router.put(
    "/me",
    response_model=schemas.UserResponse,
    summary="Обновить профиль",
    description="""
    Обновить информацию о текущем пользователе.
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
async def update_current_user(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить информацию о текущем пользователе"""
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Проверка уникальности email, если он обновляется
    if "email" in update_data and update_data["email"] != current_user.email:
        existing_user = db.query(models.User).filter(
            models.User.email == update_data["email"]
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email уже используется")
    
    # Проверка уникальности телефона, если он обновляется
    if "phone" in update_data and update_data["phone"] != current_user.phone:
        existing_user = db.query(models.User).filter(
            models.User.phone == update_data["phone"]
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Телефон уже используется")
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return schemas.UserResponse.model_validate(current_user)


@router.post(
    "/link-trainer",
    response_model=schemas.UserWithTrainer,
    summary="Связать пользователя (клиента или тренера) по коду подключения",
    description="""
    Связывает клиента с тренером.
    - Если вызывает клиент: привязывает его к тренеру по коду тренера.
    - Если вызывает тренер: привязывает к нему клиента по коду клиента.
    
    После успешной привязки возвращается информация о пользователе с данными тренера.
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
async def link_trainer_or_client(
    request: LinkTrainerRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Связать пользователя по коду подключения"""
    # Перезагружаем пользователя из БД, чтобы получить актуальные данные
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Ищем другого пользователя по коду
    other_user = db.query(models.User).filter(
        models.User.connection_code == request.connection_code
    ).first()
    
    if not other_user:
        raise HTTPException(status_code=404, detail="Пользователь с таким кодом не найден")

    if user.id == other_user.id:
        raise HTTPException(status_code=400, detail="Нельзя связаться с самим собой")

    # Логика связывания зависит от ролей
    if user.role == models.UserRole.CLIENT:
        # Клиент привязывается к тренеру
        if other_user.role != models.UserRole.TRAINER:
            raise HTTPException(status_code=400, detail="Код должен принадлежать тренеру")
        
        if user.trainer_id:
             raise HTTPException(status_code=400, detail="Клиент уже связан с тренером")
             
        user.trainer_id = other_user.id
        db.commit()
    elif user.role == models.UserRole.TRAINER:
        # Тренер привязывает клиента
        if other_user.role != models.UserRole.CLIENT:
            raise HTTPException(status_code=400, detail="Код должен принадлежать клиенту")
            
        if other_user.trainer_id:
             raise HTTPException(status_code=400, detail="Клиент уже связан с другим тренером")
             
        other_user.trainer_id = user.id
        db.commit()
    
    db.refresh(user)
    db.refresh(other_user)
    
    # Формируем ответ
    # Если это клиент, возвращаем его с тренером
    # Если это тренер, возвращаем его самого
    user_response = schemas.UserResponse.model_validate(user)
    trainer_response = None
    
    if user.role == models.UserRole.CLIENT:
        trainer_response = schemas.UserResponse.model_validate(other_user)
    
    return schemas.UserWithTrainer(
        **user_response.model_dump(),
        trainer=trainer_response
    )


@router.post("/unlink-trainer", response_model=schemas.UserResponse)
async def unlink_trainer(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Отвязать клиента от тренера (только для клиентов)"""
    if current_user.role != models.UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Только клиенты могут отвязываться от тренеров")
    
    if not current_user.trainer_id:
        raise HTTPException(status_code=400, detail="Клиент не связан с тренером")
    
    current_user.trainer_id = None
    db.commit()
    db.refresh(current_user)
    return schemas.UserResponse.model_validate(current_user)

