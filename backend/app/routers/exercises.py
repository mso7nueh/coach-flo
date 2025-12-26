from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
import uuid

router = APIRouter()


@router.post("/", response_model=schemas.ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    exercise: schemas.ExerciseCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать упражнение (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут создавать упражнения")
    
    exercise_id = str(uuid.uuid4())
    db_exercise = models.Exercise(
        id=exercise_id,
        trainer_id=current_user.id,
        name=exercise.name,
        description=exercise.description,
        muscle_groups=exercise.muscle_groups,
        equipment=exercise.equipment,
        difficulty=exercise.difficulty
    )
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    return db_exercise


@router.get("/", response_model=List[schemas.ExerciseResponse])
async def get_exercises(
    search: Optional[str] = Query(None, description="Поиск по названию"),
    muscle_group: Optional[str] = Query(None, description="Фильтр по группе мышц"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список упражнений"""
    # Показываем общие упражнения (trainer_id is null) и упражнения текущего тренера
    query = db.query(models.Exercise).filter(
        or_(
            models.Exercise.trainer_id.is_(None),
            models.Exercise.trainer_id == current_user.id
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
        or_(
            models.Exercise.trainer_id.is_(None),
            models.Exercise.trainer_id == current_user.id
        ),
        models.Exercise.id == exercise_id
    ).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Упражнение не найдено")
    
    return exercise


@router.put("/{exercise_id}", response_model=schemas.ExerciseResponse)
async def update_exercise(
    exercise_id: str,
    exercise_update: schemas.ExerciseCreate,
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
    
    exercise.name = exercise_update.name
    exercise.description = exercise_update.description
    exercise.muscle_groups = exercise_update.muscle_groups
    exercise.equipment = exercise_update.equipment
    exercise.difficulty = exercise_update.difficulty
    
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
    
    db.delete(exercise)
    db.commit()
    return None

