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
    user_response = schemas.UserResponse.model_validate(current_user)
    
    # Если это клиент и у него есть тренер, загружаем информацию о тренере
    trainer_response = None
    if current_user.role == models.UserRole.CLIENT and current_user.trainer_id:
        # Загружаем тренера из базы данных
        trainer = db.query(models.User).filter(
            models.User.id == current_user.trainer_id
        ).first()
        if trainer:
            trainer_response = schemas.UserResponse.model_validate(trainer)
    
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


@router.post("/link-trainer", response_model=schemas.UserResponse)
async def link_trainer(
    request: LinkTrainerRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Связать клиента с тренером по коду (только для клиентов)"""
    if current_user.role != models.UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Только клиенты могут связываться с тренерами")
    
    if current_user.trainer_id:
        raise HTTPException(status_code=400, detail="Клиент уже связан с тренером")
    
    # Ищем тренера по коду
    trainer = db.query(models.User).filter(
        and_(
            models.User.trainer_connection_code == request.connection_code,
            models.User.role == models.UserRole.TRAINER
        )
    ).first()
    
    if not trainer:
        raise HTTPException(status_code=404, detail="Тренер с таким кодом не найден")
    
    current_user.trainer_id = trainer.id
    db.commit()
    db.refresh(current_user)
    return schemas.UserResponse.model_validate(current_user)


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

