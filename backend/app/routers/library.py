from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
import json

router = APIRouter()


# Request/Response schemas for workout templates
class WorkoutTemplateExerciseBase(BaseModel):
    exercise_id: str
    block_type: str  # 'warmup', 'main', 'cooldown'
    sets: int
    reps: Optional[int] = None
    duration: Optional[int] = None  # minutes
    rest: Optional[int] = None  # seconds
    weight: Optional[float] = None  # kg
    notes: Optional[str] = None


class WorkoutTemplateExerciseCreate(WorkoutTemplateExerciseBase):
    pass


class WorkoutTemplateExerciseResponse(WorkoutTemplateExerciseBase):
    id: str
    order: int

    class Config:
        from_attributes = True


class WorkoutTemplateBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None
    level: Optional[str] = None
    goal: Optional[str] = None
    muscle_groups: Optional[List[str]] = None
    equipment: Optional[List[str]] = None


class WorkoutTemplateCreate(WorkoutTemplateBase):
    exercises: List[WorkoutTemplateExerciseCreate]


class WorkoutTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    level: Optional[str] = None
    goal: Optional[str] = None
    muscle_groups: Optional[List[str]] = None
    equipment: Optional[List[str]] = None
    exercises: Optional[List[WorkoutTemplateExerciseCreate]] = None


class WorkoutTemplateResponse(WorkoutTemplateBase):
    id: str
    trainer_id: str
    exercises: List[WorkoutTemplateExerciseResponse]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


def _check_template_access(template: models.WorkoutTemplate, current_user: models.User, db: Session) -> bool:
    """Check if user has access to template"""
    if current_user.role == models.UserRole.TRAINER:
        return template.trainer_id == current_user.id
    else:
        # Client can access templates from their trainer
        return template.trainer_id == current_user.trainer_id


@router.post("/workout-templates/", response_model=WorkoutTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_workout_template(
    template: WorkoutTemplateCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать шаблон тренировки (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут создавать шаблоны тренировок")
    
    template_id = str(uuid.uuid4())
    db_template = models.WorkoutTemplate(
        id=template_id,
        trainer_id=current_user.id,
        title=template.title,
        description=template.description,
        duration=template.duration,
        level=template.level,
        goal=template.goal,
        muscle_groups=json.dumps(template.muscle_groups) if template.muscle_groups else None,
        equipment=json.dumps(template.equipment) if template.equipment else None,
    )
    db.add(db_template)
    db.flush()
    
    # Add exercises
    for idx, exercise_data in enumerate(template.exercises):
        # Validate exercise exists
        exercise = db.query(models.Exercise).filter(
            models.Exercise.id == exercise_data.exercise_id
        ).first()
        if not exercise:
            raise HTTPException(status_code=404, detail=f"Упражнение {exercise_data.exercise_id} не найдено")
        
        exercise_id = str(uuid.uuid4())
        db_exercise = models.WorkoutTemplateExercise(
            id=exercise_id,
            template_id=template_id,
            exercise_id=exercise_data.exercise_id,
            block_type=exercise_data.block_type,
            sets=exercise_data.sets,
            reps=exercise_data.reps,
            duration=exercise_data.duration,
            rest=exercise_data.rest,
            weight=exercise_data.weight,
            notes=exercise_data.notes,
            order_index=idx,
        )
        db.add(db_exercise)
    
    db.commit()
    db.refresh(db_template)
    
    # Build response
    exercises_response = []
    for ex in db_template.exercises:
        exercises_response.append(WorkoutTemplateExerciseResponse(
            id=ex.id,
            exercise_id=ex.exercise_id,
            block_type=ex.block_type,
            sets=ex.sets,
            reps=ex.reps,
            duration=ex.duration,
            rest=ex.rest,
            weight=ex.weight,
            notes=ex.notes,
            order=ex.order_index
        ))
    
    return WorkoutTemplateResponse(
        id=db_template.id,
        trainer_id=db_template.trainer_id,
        title=db_template.title,
        description=db_template.description,
        duration=db_template.duration,
        level=db_template.level,
        goal=db_template.goal,
        muscle_groups=json.loads(db_template.muscle_groups) if db_template.muscle_groups else None,
        equipment=json.loads(db_template.equipment) if db_template.equipment else None,
        exercises=exercises_response,
        created_at=db_template.created_at,
        updated_at=db_template.updated_at
    )


@router.get("/workout-templates", response_model=List[WorkoutTemplateResponse])
async def get_workout_templates(
    search: Optional[str] = Query(None, description="Поиск по названию"),
    level: Optional[str] = Query(None, description="Фильтр по уровню"),
    goal: Optional[str] = Query(None, description="Фильтр по цели"),
    muscle_group: Optional[str] = Query(None, description="Фильтр по группе мышц"),
    equipment: Optional[str] = Query(None, description="Фильтр по оборудованию"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список шаблонов тренировок"""
    if current_user.role == models.UserRole.TRAINER:
        query = db.query(models.WorkoutTemplate).filter(
            models.WorkoutTemplate.trainer_id == current_user.id
        )
    else:
        # Clients see templates from their trainer
        if not current_user.trainer_id:
            return []
        query = db.query(models.WorkoutTemplate).filter(
            models.WorkoutTemplate.trainer_id == current_user.trainer_id
        )
    
    if search:
        query = query.filter(models.WorkoutTemplate.title.ilike(f"%{search}%"))
    if level:
        query = query.filter(models.WorkoutTemplate.level == level)
    if goal:
        query = query.filter(models.WorkoutTemplate.goal == goal)
    if muscle_group:
        query = query.filter(models.WorkoutTemplate.muscle_groups.ilike(f"%{muscle_group}%"))
    if equipment:
        query = query.filter(models.WorkoutTemplate.equipment.ilike(f"%{equipment}%"))
    
    templates = query.order_by(models.WorkoutTemplate.created_at.desc()).all()
    
    # Build responses
    result = []
    for template in templates:
        exercises_response = []
        for ex in template.exercises:
            exercises_response.append(WorkoutTemplateExerciseResponse(
                id=ex.id,
                exercise_id=ex.exercise_id,
                block_type=ex.block_type,
                sets=ex.sets,
                reps=ex.reps,
                duration=ex.duration,
                rest=ex.rest,
                weight=ex.weight,
                notes=ex.notes,
                order=ex.order_index
            ))
        
        result.append(WorkoutTemplateResponse(
            id=template.id,
            trainer_id=template.trainer_id,
            title=template.title,
            description=template.description,
            duration=template.duration,
            level=template.level,
            goal=template.goal,
            muscle_groups=json.loads(template.muscle_groups) if template.muscle_groups else None,
            equipment=json.loads(template.equipment) if template.equipment else None,
            exercises=exercises_response,
            created_at=template.created_at,
            updated_at=template.updated_at
        ))
    
    return result


@router.get("/workout-templates/{template_id}", response_model=WorkoutTemplateResponse)
async def get_workout_template(
    template_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить шаблон тренировки по ID"""
    template = db.query(models.WorkoutTemplate).filter(
        models.WorkoutTemplate.id == template_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    
    if not _check_template_access(template, current_user, db):
        raise HTTPException(status_code=403, detail="Нет доступа к этому шаблону")
    
    exercises_response = []
    for ex in template.exercises:
        exercises_response.append(WorkoutTemplateExerciseResponse(
            id=ex.id,
            exercise_id=ex.exercise_id,
            block_type=ex.block_type,
            sets=ex.sets,
            reps=ex.reps,
            duration=ex.duration,
            rest=ex.rest,
            weight=ex.weight,
            notes=ex.notes,
            order=ex.order_index
        ))
    
    return WorkoutTemplateResponse(
        id=template.id,
        trainer_id=template.trainer_id,
        title=template.title,
        description=template.description,
        duration=template.duration,
        level=template.level,
        goal=template.goal,
        muscle_groups=json.loads(template.muscle_groups) if template.muscle_groups else None,
        equipment=json.loads(template.equipment) if template.equipment else None,
        exercises=exercises_response,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.put("/workout-templates/{template_id}", response_model=WorkoutTemplateResponse)
async def update_workout_template(
    template_id: str,
    template_update: WorkoutTemplateUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить шаблон тренировки"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут обновлять шаблоны")
    
    template = db.query(models.WorkoutTemplate).filter(
        models.WorkoutTemplate.id == template_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    
    if template.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому шаблону")
    
    update_data = template_update.model_dump(exclude_unset=True)
    
    if "title" in update_data:
        template.title = update_data["title"]
    if "description" in update_data:
        template.description = update_data.get("description")
    if "duration" in update_data:
        template.duration = update_data.get("duration")
    if "level" in update_data:
        template.level = update_data.get("level")
    if "goal" in update_data:
        template.goal = update_data.get("goal")
    if "muscle_groups" in update_data:
        template.muscle_groups = json.dumps(update_data["muscle_groups"]) if update_data["muscle_groups"] else None
    if "equipment" in update_data:
        template.equipment = json.dumps(update_data["equipment"]) if update_data["equipment"] else None
    
    # Update exercises if provided
    if "exercises" in update_data:
        # Delete old exercises
        db.query(models.WorkoutTemplateExercise).filter(
            models.WorkoutTemplateExercise.template_id == template_id
        ).delete()
        
        # Add new exercises
        exercises_list = update_data["exercises"]
        for idx, exercise_data in enumerate(exercises_list):
            # Handle both dict and Pydantic model
            if isinstance(exercise_data, dict):
                ex_id = exercise_data.get("exercise_id")
                ex_dict = exercise_data
            else:
                ex_id = exercise_data.exercise_id
                ex_dict = exercise_data.model_dump()
            
            exercise = db.query(models.Exercise).filter(
                models.Exercise.id == ex_id
            ).first()
            if not exercise:
                raise HTTPException(status_code=404, detail=f"Упражнение {ex_id} не найдено")
            
            exercise_id = str(uuid.uuid4())
            db_exercise = models.WorkoutTemplateExercise(
                id=exercise_id,
                template_id=template_id,
                exercise_id=ex_id,
                block_type=ex_dict.get("block_type"),
                sets=ex_dict.get("sets"),
                reps=ex_dict.get("reps"),
                duration=ex_dict.get("duration"),
                rest=ex_dict.get("rest"),
                weight=ex_dict.get("weight"),
                notes=ex_dict.get("notes"),
                order_index=idx,
            )
            db.add(db_exercise)
    
    db.commit()
    db.refresh(template)
    
    # Build response
    exercises_response = []
    for ex in template.exercises:
        exercises_response.append(WorkoutTemplateExerciseResponse(
            id=ex.id,
            exercise_id=ex.exercise_id,
            block_type=ex.block_type,
            sets=ex.sets,
            reps=ex.reps,
            duration=ex.duration,
            rest=ex.rest,
            weight=ex.weight,
            notes=ex.notes,
            order=ex.order_index
        ))
    
    return WorkoutTemplateResponse(
        id=template.id,
        trainer_id=template.trainer_id,
        title=template.title,
        description=template.description,
        duration=template.duration,
        level=template.level,
        goal=template.goal,
        muscle_groups=json.loads(template.muscle_groups) if template.muscle_groups else None,
        equipment=json.loads(template.equipment) if template.equipment else None,
        exercises=exercises_response,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.delete("/workout-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout_template(
    template_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить шаблон тренировки"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут удалять шаблоны")
    
    template = db.query(models.WorkoutTemplate).filter(
        models.WorkoutTemplate.id == template_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    
    if template.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому шаблону")
    
    db.delete(template)
    db.commit()
    return None
