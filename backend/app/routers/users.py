from fastapi import APIRouter, Depends
from app import models, schemas
from app.auth import get_current_active_user

router = APIRouter()


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
async def get_current_user(
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить информацию о текущем пользователе"""
    return schemas.UserResponse.model_validate(current_user)

