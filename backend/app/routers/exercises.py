from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
from pydantic import BaseModel
import uuid

router = APIRouter()


def _get_admin_club_id(current_user: models.User, db: Session) -> Optional[str]:
    """Get club_id for CLUB_ADMIN. Falls back to Club.admin_id lookup if user.club_id is NULL."""
    if current_user.club_id:
        return current_user.club_id
    club = db.query(models.Club).filter(models.Club.admin_id == current_user.id).first()
    if club:
        # Backfill for future calls
        current_user.club_id = club.id
        db.commit()
        return club.id
    return None


class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    muscle_groups: Optional[str] = None
    equipment: Optional[str] = None
    difficulty: Optional[str] = None
    starting_position: Optional[str] = None
    execution_instructions: Optional[str] = None
    video_url: Optional[str] = None
    notes: Optional[str] = None
    visibility: Optional[str] = None
    client_id: Optional[str] = None


@router.post(
    "/",
    response_model=schemas.ExerciseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать упражнение",
    description="""
    Создание нового упражнения в библиотеке (только для тренеров).
    
    **Новые поля:**
    - `starting_position` - исходное положение для выполнения упражнения
    - `execution_instructions` - инструкция по выполнению упражнения (обязательное на фронтенде)
    - `video_url` - ссылка на видео с техникой выполнения (YouTube, Vimeo, Rutube)
    - `notes` - дополнительные заметки и рекомендации
    - `visibility` - видимость упражнения:
      - `"all"` - видно всем клиентам тренера (по умолчанию)
      - `"client"` - видно только конкретному клиенту (требует `client_id`)
      - `"trainer"` - видно только тренеру (не видно клиентам)
    - `client_id` - ID клиента, для которого упражнение доступно (используется только если `visibility === "client"`)
    
    **Валидация:**
    - Если `visibility='client'`, то `client_id` обязателен
    - Если `visibility!='client'`, то `client_id` должен быть `NULL`
    - Указанный `client_id` должен быть клиентом текущего тренера
    
    **Требуется аутентификация:** Да (JWT токен, только для тренеров)
    """
)
async def create_exercise(
    exercise: schemas.ExerciseCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать упражнение (для тренеров и администратора клуба)"""
    if current_user.role not in (models.UserRole.TRAINER, models.UserRole.CLUB_ADMIN):
        raise HTTPException(status_code=403, detail="Только тренеры могут создавать упражнения")

    exercise_data = exercise.model_dump()
    visibility = exercise_data.get("visibility", "all")
    client_id = exercise_data.get("client_id")

    if visibility == "client" and not client_id:
        raise HTTPException(status_code=400, detail="client_id обязателен, если visibility='client'")
    if visibility != "client" and client_id:
        raise HTTPException(status_code=400, detail="client_id должен быть NULL, если visibility!='client'")
    if visibility == "client" and client_id:
        client = db.query(models.User).filter(
            and_(
                models.User.id == client_id,
                models.User.trainer_id == current_user.id,
                models.User.role == models.UserRole.CLIENT
            )
        ).first()
        if not client:
            raise HTTPException(status_code=404, detail="Клиент не найден или не принадлежит тренеру")

    exercise_id = str(uuid.uuid4())

    # Club admin creates club-shared exercises
    if current_user.role == models.UserRole.CLUB_ADMIN:
        trainer_id = None
        club_id = _get_admin_club_id(current_user, db)
        if not club_id:
            raise HTTPException(status_code=400, detail="Администратор не привязан к клубу")
    else:
        trainer_id = current_user.id
        club_id = None

    db_exercise = models.Exercise(
        id=exercise_id,
        trainer_id=trainer_id,
        club_id=club_id,
        name=exercise_data["name"],
        description=exercise_data.get("description"),
        muscle_groups=exercise_data.get("muscle_groups"),
        equipment=exercise_data.get("equipment"),
        difficulty=exercise_data.get("difficulty"),
        starting_position=exercise_data.get("starting_position"),
        execution_instructions=exercise_data.get("execution_instructions"),
        video_url=exercise_data.get("video_url"),
        notes=exercise_data.get("notes"),
        visibility=visibility,
        client_id=client_id if visibility == "client" else None
    )
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    return db_exercise


@router.get(
    "/",
    response_model=List[schemas.ExerciseResponse],
    summary="Получить список упражнений",
    description="""
    Получение списка упражнений с фильтрацией по видимости.
    
    **Фильтрация по видимости:**
    - Если пользователь - тренер: возвращаются все его упражнения (включая с `visibility="trainer"`)
    - Если пользователь - клиент: возвращаются только упражнения с `visibility="all"` или `visibility="client"` и `client_id` равен ID клиента
    
    **Параметры запроса:**
    - `search` - поиск по названию упражнения
    - `muscle_group` - фильтр по группе мышц
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
async def get_exercises(
    search: Optional[str] = Query(None, description="Поиск по названию"),
    muscle_group: Optional[str] = Query(None, description="Фильтр по группе мышц"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список упражнений"""
    if current_user.role == models.UserRole.CLUB_ADMIN:
        # Club admin sees all exercises belonging to their club
        if not current_user.club_id:
            return []
        query = db.query(models.Exercise).filter(
            models.Exercise.club_id == current_user.club_id
        )
    elif current_user.role == models.UserRole.TRAINER:
        # Trainer sees their own exercises + club exercises if they belong to a club
        conditions = [models.Exercise.trainer_id == current_user.id]
        if current_user.club_id:
            conditions.append(models.Exercise.club_id == current_user.club_id)
        query = db.query(models.Exercise).filter(or_(*conditions))
    else:
        # Client sees exercises shared by their trainer
        query = db.query(models.Exercise).filter(
            or_(
                and_(
                    models.Exercise.visibility == "all",
                    models.Exercise.trainer_id == current_user.trainer_id
                ),
                and_(
                    models.Exercise.visibility == "client",
                    models.Exercise.client_id == current_user.id
                )
            )
        )

    if search:
        query = query.filter(models.Exercise.name.ilike(f"%{search}%"))
    if muscle_group:
        query = query.filter(models.Exercise.muscle_groups.ilike(f"%{muscle_group}%"))

    return query.order_by(models.Exercise.name).all()


@router.get("/{exercise_id}", response_model=schemas.ExerciseResponse)
async def get_exercise(
    exercise_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить упражнение по ID"""
    exercise = db.query(models.Exercise).filter(
        models.Exercise.id == exercise_id
    ).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Упражнение не найдено")

    if current_user.role == models.UserRole.CLUB_ADMIN:
        if exercise.club_id != current_user.club_id:
            raise HTTPException(status_code=403, detail="Нет доступа к этому упражнению")
    elif current_user.role == models.UserRole.TRAINER:
        if exercise.trainer_id != current_user.id and exercise.club_id != current_user.club_id:
            raise HTTPException(status_code=403, detail="Нет доступа к этому упражнению")
    else:
        if not (
            (exercise.visibility == "all" and exercise.trainer_id == current_user.trainer_id) or
            (exercise.visibility == "client" and exercise.client_id == current_user.id)
        ):
            raise HTTPException(status_code=403, detail="Нет доступа к этому упражнению")
    return exercise


@router.put(
    "/{exercise_id}",
    response_model=schemas.ExerciseResponse,
    summary="Обновить упражнение",
    description="""
    Обновление упражнения (только для тренеров, только свои упражнения).
    
    Все поля опциональные (частичное обновление).
    
    **Валидация:**
    - Если обновляется `visibility='client'`, то `client_id` обязателен
    - Если обновляется `visibility!='client'`, то `client_id` должен быть `NULL`
    - Указанный `client_id` должен быть клиентом текущего тренера
    
    **Требуется аутентификация:** Да (JWT токен, только для тренеров)
    """
)
async def update_exercise(
    exercise_id: str,
    exercise_update: ExerciseUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить упражнение (тренеры — свои, club admin — клубные)"""
    if current_user.role not in (models.UserRole.TRAINER, models.UserRole.CLUB_ADMIN):
        raise HTTPException(status_code=403, detail="Только тренеры могут обновлять упражнения")

    if current_user.role == models.UserRole.CLUB_ADMIN:
        exercise = db.query(models.Exercise).filter(
            and_(models.Exercise.id == exercise_id, models.Exercise.club_id == current_user.club_id)
        ).first()
    else:
        exercise = db.query(models.Exercise).filter(
            and_(models.Exercise.id == exercise_id, models.Exercise.trainer_id == current_user.id)
        ).first()

    if not exercise:
        raise HTTPException(status_code=404, detail="Упражнение не найдено")

    update_data = exercise_update.model_dump(exclude_unset=True)
    visibility = update_data.get("visibility")
    client_id = update_data.get("client_id")
    if visibility is not None:
        if visibility == "client" and not client_id:
            raise HTTPException(status_code=400, detail="client_id обязателен, если visibility='client'")
        if visibility != "client" and client_id:
            raise HTTPException(status_code=400, detail="client_id должен быть NULL, если visibility!='client'")
        if visibility == "client" and client_id:
            client = db.query(models.User).filter(
                and_(
                    models.User.id == client_id,
                    models.User.trainer_id == current_user.id,
                    models.User.role == models.UserRole.CLIENT
                )
            ).first()
            if not client:
                raise HTTPException(status_code=404, detail="Клиент не найден или не принадлежит тренеру")

    for field in ["name", "description", "muscle_groups", "equipment", "difficulty",
                  "starting_position", "execution_instructions", "video_url", "notes", "visibility"]:
        if field in update_data:
            setattr(exercise, field, update_data.get(field))
    if "client_id" in update_data:
        exercise.client_id = update_data.get("client_id") if update_data.get("visibility") == "client" else None

    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить упражнение (тренеры — свои, club admin — клубные)"""
    if current_user.role not in (models.UserRole.TRAINER, models.UserRole.CLUB_ADMIN):
        raise HTTPException(status_code=403, detail="Только тренеры могут удалять упражнения")

    if current_user.role == models.UserRole.CLUB_ADMIN:
        exercise = db.query(models.Exercise).filter(
            and_(models.Exercise.id == exercise_id, models.Exercise.club_id == current_user.club_id)
        ).first()
    else:
        exercise = db.query(models.Exercise).filter(
            and_(models.Exercise.id == exercise_id, models.Exercise.trainer_id == current_user.id)
        ).first()

    if not exercise:
        raise HTTPException(status_code=404, detail="Упражнение не найдено")

    db.query(models.WorkoutTemplateExercise).filter(
        models.WorkoutTemplateExercise.exercise_id == exercise_id
    ).delete()
    db.delete(exercise)
    db.commit()
    return None

