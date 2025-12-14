from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
import uuid

router = APIRouter()


@router.post(
    "/complete",
    response_model=schemas.OnboardingResponse,
    summary="Завершить онбординг",
    description="""
    Сохраняет данные онбординга для текущего пользователя.
    
    **Доступные цели (goals):**
    - `weight_loss` - Похудение
    - `muscle_gain` - Набор мышечной массы
    - `endurance` - Выносливость
    - `strength` - Сила
    - `flexibility` - Гибкость
    - `general_fitness` - Общее здоровье
    
    **Уровни активности (activity_level):**
    - `low` - Низкий
    - `medium` - Средний
    - `high` - Высокий
    
    **Ограничения (restrictions):**
    Список строк с ограничениями (например: "no_dairy", "vegetarian", "gluten_free")
    
    После успешного завершения онбординга пользователь помечается как прошедший онбординг.
    
    **Требуется аутентификация:** Да (JWT токен)
    """,
    responses={
        200: {
            "description": "Онбординг успешно завершен",
            "content": {
                "application/json": {
                    "example": {
                        "id": "uuid-here",
                        "user_id": "user-uuid",
                        "weight": 75.5,
                        "height": 180,
                        "age": 30,
                        "goals": ["weight_loss", "muscle_gain"],
                        "restrictions": ["no_dairy"],
                        "activity_level": "medium",
                        "created_at": "2024-01-01T00:00:00"
                    }
                }
            }
        },
        401: {"description": "Не авторизован"}
    }
)
async def complete_onboarding(
    metrics: schemas.OnboardingMetrics,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Завершение онбординга"""
    # Проверяем, что онбординг еще не пройден
    existing_onboarding = db.query(models.Onboarding).filter(
        models.Onboarding.user_id == current_user.id
    ).first()
    
    if existing_onboarding:
        # Обновляем существующий онбординг
        if metrics.weight is not None:
            existing_onboarding.weight = metrics.weight
        if metrics.height is not None:
            existing_onboarding.height = metrics.height
        if metrics.age is not None:
            existing_onboarding.age = metrics.age
        if metrics.activity_level is not None:
            existing_onboarding.activity_level = metrics.activity_level
        
        # Удаляем старые цели и ограничения
        db.query(models.OnboardingGoal).filter(
            models.OnboardingGoal.onboarding_id == existing_onboarding.id
        ).delete()
        db.query(models.OnboardingRestriction).filter(
            models.OnboardingRestriction.onboarding_id == existing_onboarding.id
        ).delete()
        
        # Добавляем новые цели
        if metrics.goals:
            for goal in metrics.goals:
                goal_obj = models.OnboardingGoal(
                    id=str(uuid.uuid4()),
                    onboarding_id=existing_onboarding.id,
                    goal=goal
                )
                db.add(goal_obj)
        
        # Добавляем новые ограничения
        if metrics.restrictions:
            for restriction in metrics.restrictions:
                restriction_obj = models.OnboardingRestriction(
                    id=str(uuid.uuid4()),
                    onboarding_id=existing_onboarding.id,
                    restriction=restriction
                )
                db.add(restriction_obj)
        
        db.commit()
        db.refresh(existing_onboarding)
        
        # Получаем цели и ограничения
        goals = [g.goal for g in db.query(models.OnboardingGoal).filter(
            models.OnboardingGoal.onboarding_id == existing_onboarding.id
        ).all()]
        restrictions = [r.restriction for r in db.query(models.OnboardingRestriction).filter(
            models.OnboardingRestriction.onboarding_id == existing_onboarding.id
        ).all()]
        
        # Помечаем онбординг как пройденный
        current_user.onboarding_seen = True
        db.commit()
        
        return schemas.OnboardingResponse(
            id=existing_onboarding.id,
            user_id=existing_onboarding.user_id,
            weight=existing_onboarding.weight,
            height=existing_onboarding.height,
            age=existing_onboarding.age,
            goals=goals,
            restrictions=restrictions,
            activity_level=existing_onboarding.activity_level,
            created_at=existing_onboarding.created_at
        )
    else:
        # Создаем новый онбординг
        onboarding_id = str(uuid.uuid4())
        onboarding = models.Onboarding(
            id=onboarding_id,
            user_id=current_user.id,
            weight=metrics.weight,
            height=metrics.height,
            age=metrics.age,
            activity_level=metrics.activity_level
        )
        db.add(onboarding)
        db.flush()  # Flush чтобы получить ID в базе перед добавлением связанных записей
        
        # Добавляем цели
        if metrics.goals:
            for goal in metrics.goals:
                goal_obj = models.OnboardingGoal(
                    id=str(uuid.uuid4()),
                    onboarding_id=onboarding_id,
                    goal=goal
                )
                db.add(goal_obj)
        
        # Добавляем ограничения
        if metrics.restrictions:
            for restriction in metrics.restrictions:
                restriction_obj = models.OnboardingRestriction(
                    id=str(uuid.uuid4()),
                    onboarding_id=onboarding_id,
                    restriction=restriction
                )
                db.add(restriction_obj)
        
        # Помечаем онбординг как пройденный
        current_user.onboarding_seen = True
        db.commit()
        db.refresh(onboarding)
        
        return schemas.OnboardingResponse(
            id=onboarding.id,
            user_id=onboarding.user_id,
            weight=onboarding.weight,
            height=onboarding.height,
            age=onboarding.age,
            goals=metrics.goals or [],
            restrictions=metrics.restrictions or [],
            activity_level=onboarding.activity_level,
            created_at=onboarding.created_at
        )


@router.get(
    "/",
    response_model=schemas.OnboardingResponse,
    summary="Получить данные онбординга",
    description="""
    Получить сохраненные данные онбординга для текущего пользователя.
    
    **Требуется аутентификация:** Да (JWT токен)
    """,
    responses={
        200: {
            "description": "Данные онбординга",
            "content": {
                "application/json": {
                    "example": {
                        "id": "uuid-here",
                        "user_id": "user-uuid",
                        "weight": 75.5,
                        "height": 180,
                        "age": 30,
                        "goals": ["weight_loss", "muscle_gain"],
                        "restrictions": ["no_dairy"],
                        "activity_level": "medium",
                        "created_at": "2024-01-01T00:00:00"
                    }
                }
            }
        },
        401: {"description": "Не авторизован"},
        404: {"description": "Онбординг не найден"}
    }
)
async def get_onboarding(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить данные онбординга текущего пользователя"""
    onboarding = db.query(models.Onboarding).filter(
        models.Onboarding.user_id == current_user.id
    ).first()
    
    if not onboarding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Онбординг не найден"
        )
    
    # Получаем цели и ограничения
    goals = [g.goal for g in db.query(models.OnboardingGoal).filter(
        models.OnboardingGoal.onboarding_id == onboarding.id
    ).all()]
    restrictions = [r.restriction for r in db.query(models.OnboardingRestriction).filter(
        models.OnboardingRestriction.onboarding_id == onboarding.id
    ).all()]
    
    return schemas.OnboardingResponse(
        id=onboarding.id,
        user_id=onboarding.user_id,
        weight=onboarding.weight,
        height=onboarding.height,
        age=onboarding.age,
        goals=goals,
        restrictions=restrictions,
        activity_level=onboarding.activity_level,
        created_at=onboarding.created_at
    )

