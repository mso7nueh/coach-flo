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
    """Создать упражнение (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут создавать упражнения")
    
    # Validate visibility and client_id
    exercise_data = exercise.model_dump()
    visibility = exercise_data.get("visibility", "all")
    client_id = exercise_data.get("client_id")
    
    if visibility == "client" and not client_id:
        raise HTTPException(status_code=400, detail="client_id обязателен, если visibility='client'")
    
    if visibility != "client" and client_id:
        raise HTTPException(status_code=400, detail="client_id должен быть NULL, если visibility!='client'")
    
    # If visibility is 'client', verify client belongs to trainer
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
    db_exercise = models.Exercise(
        id=exercise_id,
        trainer_id=current_user.id,
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
    # For trainers: show all their exercises (including visibility='trainer')
    # For clients: show only exercises with visibility='all' or visibility='client' with their client_id
    if current_user.role == models.UserRole.TRAINER:
        query = db.query(models.Exercise).filter(
            models.Exercise.trainer_id == current_user.id
        )
    else:
        # Client can see: visibility='all' OR (visibility='client' AND client_id=current_user.id)
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
    
    exercises = query.order_by(models.Exercise.name).all()
    return exercises


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
    
    # Check access based on visibility
    if current_user.role == models.UserRole.TRAINER:
        if exercise.trainer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к этому упражнению")
    else:
        # Client can access if visibility='all' or visibility='client' with their client_id
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
    """Обновить упражнение (только для тренеров, только свои упражнения)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут обновлять упражнения")
    
    exercise = db.query(models.Exercise).filter(
        and_(
            models.Exercise.id == exercise_id,
            models.Exercise.trainer_id == current_user.id
        )
    ).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Упражнение не найдено")
    
    update_data = exercise_update.model_dump(exclude_unset=True)
    
    # Validate visibility and client_id if provided
    visibility = update_data.get("visibility")
    client_id = update_data.get("client_id")
    
    if visibility is not None:
        if visibility == "client" and not client_id:
            raise HTTPException(status_code=400, detail="client_id обязателен, если visibility='client'")
        if visibility != "client" and client_id:
            raise HTTPException(status_code=400, detail="client_id должен быть NULL, если visibility!='client'")
        
        # If visibility is 'client', verify client belongs to trainer
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
    
    # Update fields
    if "name" in update_data:
        exercise.name = update_data["name"]
    if "description" in update_data:
        exercise.description = update_data.get("description")
    if "muscle_groups" in update_data:
        exercise.muscle_groups = update_data.get("muscle_groups")
    if "equipment" in update_data:
        exercise.equipment = update_data.get("equipment")
    if "difficulty" in update_data:
        exercise.difficulty = update_data.get("difficulty")
    if "starting_position" in update_data:
        exercise.starting_position = update_data.get("starting_position")
    if "execution_instructions" in update_data:
        exercise.execution_instructions = update_data.get("execution_instructions")
    if "video_url" in update_data:
        exercise.video_url = update_data.get("video_url")
    if "notes" in update_data:
        exercise.notes = update_data.get("notes")
    if "visibility" in update_data:
        exercise.visibility = update_data["visibility"]
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
    """Удалить упражнение (только для тренеров, только свои упражнения)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут удалять упражнения")
    
    exercise = db.query(models.Exercise).filter(
        and_(
            models.Exercise.id == exercise_id,
            models.Exercise.trainer_id == current_user.id
        )
    ).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Упражнение не найдено")
    
    # Удаляем все связанные записи из workout_template_exercises перед удалением упражнения
    # Это необходимо, так как ограничение внешнего ключа может блокировать удаление
    db.query(models.WorkoutTemplateExercise).filter(
        models.WorkoutTemplateExercise.exercise_id == exercise_id
    ).delete()
    
    db.delete(exercise)
    db.commit()
    return None

