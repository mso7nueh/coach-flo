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


@router.post(
    "/workout-templates/",
    response_model=WorkoutTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать шаблон тренировки",
    description="""
    Создание шаблона тренировки (только для тренеров).
    
    Шаблон тренировки - это переиспользуемый набор упражнений, который можно применять при создании дней программ.
    
    **Параметры:**
    - `title` - название шаблона (обязательное)
    - `description` - описание тренировки
    - `duration` - длительность тренировки в минутах
    - `level` - уровень сложности: "beginner", "intermediate", "advanced"
    - `goal` - цель тренировки: "weight_loss", "muscle_gain", "endurance", "flexibility", "general"
    - `muscle_groups` - массив групп мышц
    - `equipment` - массив необходимого оборудования
    - `exercises` - массив упражнений с параметрами:
      - `exercise_id` - ID упражнения из библиотеки (обязательное)
      - `block_type` - тип блока: "warmup", "main", "cooldown" (обязательное)
      - `sets` - количество подходов (обязательное)
      - `reps` - количество повторений
      - `duration` - длительность в минутах (если упражнение на время)
      - `rest` - время отдыха в секундах
      - `weight` - вес в кг
      - `notes` - заметки к упражнению
    
    **Требуется аутентификация:** Да (JWT токен, только для тренеров)
    """
)
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


@router.get(
    "/workout-templates",
    response_model=List[WorkoutTemplateResponse],
    summary="Получить список шаблонов тренировок",
    description="""
    Получение списка шаблонов тренировок с фильтрацией.
    
    **Права доступа:**
    - Тренеры видят только свои шаблоны
    - Клиенты видят шаблоны своих тренеров
    
    **Параметры запроса:**
    - `search` - поиск по названию
    - `level` - фильтр по уровню: "beginner", "intermediate", "advanced"
    - `goal` - фильтр по цели: "weight_loss", "muscle_gain", "endurance", "flexibility", "general"
    - `muscle_group` - фильтр по группе мышц
    - `equipment` - фильтр по оборудованию
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
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


@router.get(
    "/workout-templates/{template_id}",
    response_model=WorkoutTemplateResponse,
    summary="Получить шаблон тренировки по ID",
    description="""
    Получение шаблона тренировки по ID.
    
    **Права доступа:**
    - Тренер может получить доступ к своим шаблонам
    - Клиент может получить доступ только к шаблонам своего тренера
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
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


@router.put(
    "/workout-templates/{template_id}",
    response_model=WorkoutTemplateResponse,
    summary="Обновить шаблон тренировки",
    description="""
    Обновление шаблона тренировки (только для тренеров, только свои шаблоны).
    
    Все поля опциональные (частичное обновление).
    Если передается `exercises`, список упражнений полностью заменяется.
    
    **Требуется аутентификация:** Да (JWT токен, только для тренеров)
    """
)
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


@router.delete(
    "/workout-templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить шаблон тренировки",
    description="""
    Удаление шаблона тренировки (только для тренеров, только свои шаблоны).
    
    **Требуется аутентификация:** Да (JWT токен, только для тренеров)
    """
)
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


@router.post(
    "/workout-templates/from-day/{day_id}",
    response_model=WorkoutTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать шаблон из дня программы",
    description="""
    Создание шаблона тренировки на основе существующего дня программы.
    
    **Требуется аутентификация:** Да (JWT токен, только для тренеров)
    """
)
async def create_workout_template_from_day(
    day_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать шаблон из дня программы (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут создавать шаблоны")
    
    # Получаем день программы
    day = db.query(models.ProgramDay).filter(
        models.ProgramDay.id == day_id
    ).first()
    
    if not day:
        raise HTTPException(status_code=404, detail="День программы не найден")
    
    # Проверяем доступ к программе
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == day.program_id
    ).first()
    
    if program.user_id != current_user.id:
        # Проверяем, является ли пользователь клиентом этого тренера
        client = db.query(models.User).filter(
            and_(
                models.User.id == program.user_id,
                models.User.trainer_id == current_user.id
            )
        ).first()
        if not client:
            raise HTTPException(status_code=403, detail="Нет доступа к этому дню программы")

    template_id = str(uuid.uuid4())
    db_template = models.WorkoutTemplate(
        id=template_id,
        trainer_id=current_user.id,
        title=day.name,
        description=day.notes,
    )
    db.add(db_template)
    db.flush()
    
    # Копируем упражнения из всех блоков
    idx = 0
    for block in day.blocks:
        for ex in block.exercises:
            # Пытаемся найти упражнение в библиотеке по названию
            # Это упрощенный подход, так как ProgramExercise не имеет ссылки на Exercise ID в текущей модели
            lib_ex = db.query(models.Exercise).filter(
                and_(
                    models.Exercise.name == ex.title,
                    models.Exercise.trainer_id == current_user.id
                )
            ).first()
            
            if not lib_ex:
                # Если не нашли своего, ищем в общей библиотеке
                lib_ex = db.query(models.Exercise).filter(
                    and_(
                        models.Exercise.name == ex.title,
                        models.Exercise.trainer_id == None
                    )
                ).first()
            
            # Если не нашли в библиотеке, создаем новое упражнение
            if not lib_ex:
                lib_ex_id = str(uuid.uuid4())
                lib_ex = models.Exercise(
                    id=lib_ex_id,
                    trainer_id=current_user.id,
                    name=ex.title,
                    description=ex.description,
                    video_url=ex.video_url,
                    visibility='trainer'
                )
                db.add(lib_ex)
                db.flush()

            # Вспомогательная функция для парсинга числовых значений из строк типа "70 кг"
            def _parse_str(s, unit):
                if not s: return None
                try: return float(s.replace(f" {unit}", "").strip())
                except: return None

            exercise_template_id = str(uuid.uuid4())
            db_exercise = models.WorkoutTemplateExercise(
                id=exercise_template_id,
                template_id=template_id,
                exercise_id=lib_ex.id,
                block_type=block.type,
                sets=ex.sets,
                reps=ex.reps,
                duration=None, # Мы не можем достоверно спарсить это из строки в данный момент
                rest=None,
                weight=_parse_str(ex.weight, "кг"),
                notes=ex.description,
                order_index=idx,
            )
            # Пытаемся спарсить duration и rest если возможно
            if ex.duration and " мин" in ex.duration:
                try: db_exercise.duration = int(ex.duration.replace(" мин", "").strip())
                except: pass
            if ex.rest and " сек" in ex.rest:
                try: db_exercise.rest = int(ex.rest.replace(" сек", "").strip())
                except: pass

            db.add(db_exercise)
            idx += 1
    
    db.commit()
    db.refresh(db_template)
    
    # Build response
    exercises_response = []
    for ex_t in db_template.exercises:
        exercises_response.append(WorkoutTemplateExerciseResponse(
            id=ex_t.id,
            exercise_id=ex_t.exercise_id,
            block_type=ex_t.block_type,
            sets=ex_t.sets,
            reps=ex_t.reps,
            duration=ex_t.duration,
            rest=ex_t.rest,
            weight=ex_t.weight,
            notes=ex_t.notes,
            order=ex_t.order_index
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
