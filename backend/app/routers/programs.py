from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
from pydantic import BaseModel
import uuid

router = APIRouter()


@router.post("/{program_id}/copy", response_model=schemas.TrainingProgramResponse, status_code=status.HTTP_201_CREATED)
async def copy_program(
    program_id: str,
    target_user_id: Optional[str] = Query(None, description="ID пользователя назначения (для тренеров)"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Копировать программу (назначить клиенту или копировать себе).
    Создает полную копию программы, дней, блоков и упражнений.
    """
    # Исходная программа
    source_program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not source_program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    # Проверка доступа к исходной программе
    if not _check_program_access(source_program, current_user, db):
        raise HTTPException(status_code=403, detail="Нет доступа к этой программе")

    # Определяем владельца и целевого пользователя новой программы
    new_owner = source_program.owner
    new_user_id = current_user.id
    
    if current_user.role == models.UserRole.TRAINER:
        if target_user_id:
            # Тренер назначает программу клиенту
            client = db.query(models.User).filter(
                and_(
                    models.User.id == target_user_id,
                    models.User.trainer_id == current_user.id
                )
            ).first()
            if not client:
                raise HTTPException(status_code=404, detail="Клиент не найден")
            new_user_id = target_user_id
            # Если тренер назначает, владелец остается 'trainer', чтобы клиент не мог удалить
            new_owner = "trainer" 
        else:
            # Тренер копирует себе
            new_owner = "trainer"
    else:
        # Клиент копирует себе
        new_owner = "client"

    # Копируем программу
    new_program_id = str(uuid.uuid4())
    new_title = source_program.title
    
    # Если это назначение клиенту, можно добавить префикс или оставить как есть
    # ТЗ: "Программа тренера" vs "Моя программа"
    # Это лучше решать на фронте при отображении, но здесь мы просто копируем название
    
    db_program = models.TrainingProgram(
        id=new_program_id,
        user_id=new_user_id,
        title=new_title,
        description=source_program.description,
        owner=new_owner
    )
    db.add(db_program)
    db.flush() # чтобы получить ID
    
    # Копируем дни
    source_days = db.query(models.ProgramDay).filter(
        models.ProgramDay.program_id == program_id
    ).order_by(models.ProgramDay.order).all()
    
    for day in source_days:
        new_day_id = str(uuid.uuid4())
        db_day = models.ProgramDay(
            id=new_day_id,
            program_id=new_program_id,
            name=day.name,
            order=day.order,
            notes=day.notes,
            owner=new_owner,
            source_template_id=day.id # Ссылка на исходный день, может пригодиться
        )
        db.add(db_day)
        db.flush()
        
        # Копируем блоки
        source_blocks = db.query(models.ProgramBlock).filter(
            models.ProgramBlock.day_id == day.id
        ).order_by(models.ProgramBlock.order).all()
        
        for block in source_blocks:
            new_block_id = str(uuid.uuid4())
            db_block = models.ProgramBlock(
                id=new_block_id,
                day_id=new_day_id,
                type=block.type,
                title=block.title,
                order=block.order
            )
            db.add(db_block)
            db.flush()
            
            # Копируем упражнения
            source_exercises = db.query(models.ProgramExercise).filter(
                models.ProgramExercise.block_id == block.id
            ).order_by(models.ProgramExercise.order).all()
            
            for ex in source_exercises:
                new_ex_id = str(uuid.uuid4())
                db_ex = models.ProgramExercise(
                    id=new_ex_id,
                    block_id=new_block_id,
                    title=ex.title,
                    sets=ex.sets,
                    reps=ex.reps,
                    duration=ex.duration,
                    rest=ex.rest,
                    weight=ex.weight,
                    description=ex.description,
                    video_url=ex.video_url,
                    order=ex.order
                )
                db.add(db_ex)
    
    db.commit()
    db.refresh(db_program)
    return db_program


# Request schemas for program exercises (numeric format)
class ProgramExerciseCreateNumeric(BaseModel):
    title: str
    sets: int = 1
    reps: Optional[int] = None
    duration: Optional[int] = None  # minutes
    rest: Optional[int] = None  # seconds
    weight: Optional[float] = None  # kg


class ProgramExerciseUpdateNumeric(BaseModel):
    title: Optional[str] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    duration: Optional[int] = None  # minutes
    rest: Optional[int] = None  # seconds
    weight: Optional[float] = None  # kg


class ProgramDayUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None


class ProgramExerciseResponseNumeric(BaseModel):
    id: str
    block_id: str
    title: str
    sets: int
    reps: Optional[int] = None
    duration: Optional[int] = None  # minutes
    rest: Optional[int] = None  # seconds
    weight: Optional[float] = None  # kg
    order: int

    class Config:
        from_attributes = True


@router.post("/", response_model=schemas.TrainingProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    program: schemas.TrainingProgramCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать программу тренировок"""
    program_id = str(uuid.uuid4())
    
    # Определяем для кого создаётся программа
    target_user_id = current_user.id
    owner = "trainer" if current_user.role == models.UserRole.TRAINER else "client"
    
    # Тренер может создавать программы для своих клиентов
    if program.user_id and current_user.role == models.UserRole.TRAINER:
        # Проверяем, что клиент связан с тренером
        client = db.query(models.User).filter(
            and_(
                models.User.id == program.user_id,
                models.User.trainer_id == current_user.id
            )
        ).first()
        if not client:
            raise HTTPException(status_code=404, detail="Клиент не найден")
        target_user_id = program.user_id
        owner = "client"
    elif program.user_id and current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут создавать программы для других пользователей")
    
    db_program = models.TrainingProgram(
        id=program_id,
        user_id=target_user_id,
        title=program.title,
        description=program.description,
        owner=owner
    )
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return db_program


@router.get("/", response_model=List[schemas.TrainingProgramResponse])
async def get_programs(
    user_id: Optional[str] = Query(None, description="ID пользователя (только для тренеров)"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список программ"""
    # Тренеры могут просматривать программы своих клиентов
    target_user_id = current_user.id
    if user_id and current_user.role == models.UserRole.TRAINER:
        # Проверяем, что клиент связан с тренером
        client = db.query(models.User).filter(
            and_(
                models.User.id == user_id,
                models.User.trainer_id == current_user.id
            )
        ).first()
        if not client:
            raise HTTPException(status_code=404, detail="Клиент не найден")
        target_user_id = user_id
    elif user_id and current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать программы других пользователей")
    
    programs = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.user_id == target_user_id
    ).all()
    return programs


@router.get("/{program_id}", response_model=schemas.TrainingProgramResponse)
async def get_program(
    program_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить программу по ID"""
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    # Проверяем права доступа
    if current_user.role == models.UserRole.TRAINER:
        # Тренер может просматривать программы своих клиентов
        if program.user_id != current_user.id:
            client = db.query(models.User).filter(
                and_(
                    models.User.id == program.user_id,
                    models.User.trainer_id == current_user.id
                )
            ).first()
            if not client:
                raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    else:
        # Клиент может просматривать только свои программы
        if program.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    return program


@router.put("/{program_id}", response_model=schemas.TrainingProgramResponse)
async def update_program(
    program_id: str,
    program_update: schemas.TrainingProgramUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить программу тренировок"""
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    # Проверяем права доступа
    if not _check_program_access(program, current_user, db):
        raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    # Обновляем поля программы
    update_data = program_update.model_dump(exclude_unset=True)
    if 'title' in update_data and update_data['title'] is not None:
        program.title = update_data['title']
    if 'description' in update_data:
        program.description = update_data.get('description')
    
    db.commit()
    db.refresh(program)
    return program


@router.post("/{program_id}/days", response_model=schemas.ProgramDayResponse, status_code=status.HTTP_201_CREATED)
async def create_program_day(
    program_id: str,
    day: schemas.ProgramDayCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать день программы"""
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    # Проверяем права доступа
    if current_user.role == models.UserRole.TRAINER:
        # Тренер может создавать дни в своих программах и программах клиентов
        if program.user_id != current_user.id:
            client = db.query(models.User).filter(
                and_(
                    models.User.id == program.user_id,
                    models.User.trainer_id == current_user.id
                )
            ).first()
            if not client:
                raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    else:
        # Клиент может создавать дни только в своих программах
        if program.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    # Получаем текущий порядок
    existing_days = db.query(models.ProgramDay).filter(
        models.ProgramDay.program_id == program_id
    ).all()
    order = len(existing_days)
    
    day_id = str(uuid.uuid4())
    owner = program.owner
    
    db_day = models.ProgramDay(
        id=day_id,
        program_id=program_id,
        name=day.name,
        order=order,
        notes=day.notes,
        owner=owner,
        source_template_id=day.source_template_id
    )
    db.add(db_day)
    db.flush()
    
    # Создаем блоки
    block_order = 0
    for block_data in day.blocks:
        block_id = str(uuid.uuid4())
        db_block = models.ProgramBlock(
            id=block_id,
            day_id=day_id,
            type=block_data.type,
            title=block_data.title,
            order=block_order
        )
        db.add(db_block)
        db.flush()
        
        # Создаем упражнения
        exercise_order = 0
        for exercise_data in block_data.exercises:
            exercise_id = str(uuid.uuid4())
            db_exercise = models.ProgramExercise(
                id=exercise_id,
                block_id=block_id,
                title=exercise_data.title,
                sets=exercise_data.sets,
                reps=exercise_data.reps,
                duration=exercise_data.duration,
                rest=exercise_data.rest,
                weight=exercise_data.weight,
                description=exercise_data.description,
                video_url=exercise_data.video_url,
                order=exercise_order
            )
            db.add(db_exercise)
            exercise_order += 1
        
        block_order += 1
    
    db.commit()
    db.refresh(db_day)
    
    # Загружаем связанные данные
    db.refresh(db_day)
    return db_day


@router.get("/{program_id}/days", response_model=List[schemas.ProgramDayResponse])
async def get_program_days(
    program_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить дни программы"""
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    # Проверяем права доступа
    if current_user.role == models.UserRole.TRAINER:
        # Тренер может просматривать дни программ своих клиентов
        if program.user_id != current_user.id:
            client = db.query(models.User).filter(
                and_(
                    models.User.id == program.user_id,
                    models.User.trainer_id == current_user.id
                )
            ).first()
            if not client:
                raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    else:
        # Клиент может просматривать дни только своих программ
        if program.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    days = db.query(models.ProgramDay).filter(
        models.ProgramDay.program_id == program_id
    ).order_by(models.ProgramDay.order).all()
    
    return days


@router.get("/{program_id}/days/{day_id}", response_model=schemas.ProgramDayResponse)
async def get_program_day(
    program_id: str,
    day_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить день программы по ID"""
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    # Проверяем права доступа
    if current_user.role == models.UserRole.TRAINER:
        # Тренер может просматривать дни программ своих клиентов
        if program.user_id != current_user.id:
            client = db.query(models.User).filter(
                and_(
                    models.User.id == program.user_id,
                    models.User.trainer_id == current_user.id
                )
            ).first()
            if not client:
                raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    else:
        # Клиент может просматривать дни только своих программ
        if program.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    day = db.query(models.ProgramDay).filter(
        and_(
            models.ProgramDay.id == day_id,
            models.ProgramDay.program_id == program_id
        )
    ).first()
    
    if not day:
        raise HTTPException(status_code=404, detail="День программы не найден")
    
    return day


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(
    program_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить программу"""
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    # Проверяем права доступа
    if not _check_program_access(program, current_user, db):
        raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    # Запрещаем клиентам удалять программы тренеров
    if current_user.role == models.UserRole.CLIENT and program.owner == "trainer":
        raise HTTPException(status_code=403, detail="Нельзя удалить программу, созданную тренером")
    
    # Обнуляем program_day_id в тренировках, связанных с днями этой программы
    day_ids = db.query(models.ProgramDay.id).filter(
        models.ProgramDay.program_id == program_id
    ).subquery()
    db.query(models.Workout).filter(
        models.Workout.program_day_id.in_(day_ids)
    ).update({models.Workout.program_day_id: None}, synchronize_session='fetch')
    db.flush()  # чтобы UPDATE выполнился до каскадного удаления program_days

    db.delete(program)
    db.commit()
    return None


@router.delete("/{program_id}/days/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program_day(
    program_id: str,
    day_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить день программы"""
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    # Проверяем права доступа
    if not _check_program_access(program, current_user, db):
        raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    day = db.query(models.ProgramDay).filter(
        and_(
            models.ProgramDay.id == day_id,
            models.ProgramDay.program_id == program_id
        )
    ).first()
    
    if not day:
        raise HTTPException(status_code=404, detail="День программы не найден")
        
    # Запрещаем клиентам удалять дни, созданные тренером
    if current_user.role == models.UserRole.CLIENT and day.owner == "trainer":
        raise HTTPException(status_code=403, detail="Нельзя удалить тренировку, созданную тренером")
    
    # Для совместимости: если owner не задан или client, но сама программа trainer, 
    # нужно проверить логику. В ТЗ сказано "если клиент создал план, он может его удалить".
    # Значит если day.owner == 'client', то можно удалять даже в программе тренера?
    # Обычно в программе тренера дни тоже 'trainer'. 
    # Если клиент добавляет день в программу тренера, он становится 'client' (см. create_program_day).
    # Так что проверка day.owner должна быть достаточной.
    
    # Обнуляем program_day_id в связанных тренировках, чтобы избежать FK constraint violation
    db.query(models.Workout).filter(
        models.Workout.program_day_id == day_id
    ).update({models.Workout.program_day_id: None})
    db.flush()  # чтобы UPDATE выполнился до DELETE program_day

    db.delete(day)
    db.commit()
    return None


# Helper functions for converting between string and numeric formats
def _string_to_number(value: Optional[str], unit: str) -> Optional[int]:
    """Convert string like '90 сек' to integer 90"""
    if not value:
        return None
    try:
        return int(value.replace(f" {unit}", "").strip())
    except (ValueError, AttributeError):
        return None


def _number_to_string(value: Optional[int], unit: str) -> Optional[str]:
    """Convert integer 90 to string '90 сек'"""
    if value is None:
        return None
    return f"{value} {unit}"


def _string_to_float(value: Optional[str], unit: str) -> Optional[float]:
    """Convert string like '70 кг' to float 70.0"""
    if not value:
        return None
    try:
        return float(value.replace(f" {unit}", "").strip())
    except (ValueError, AttributeError):
        return None


def _float_to_string(value: Optional[float], unit: str) -> Optional[str]:
    """Convert float 70.0 to string '70 кг'"""
    if value is None:
        return None
    return f"{value} {unit}"


def _exercise_to_numeric_response(exercise: models.ProgramExercise) -> ProgramExerciseResponseNumeric:
    """Convert exercise from DB format to numeric API response"""
    return ProgramExerciseResponseNumeric(
        id=exercise.id,
        block_id=exercise.block_id,
        title=exercise.title,
        sets=exercise.sets,
        reps=exercise.reps,
        duration=_string_to_number(exercise.duration, "мин"),
        rest=_string_to_number(exercise.rest, "сек"),
        weight=_string_to_float(exercise.weight, "кг"),
        order=exercise.order
    )


def _check_program_access(program: models.TrainingProgram, current_user: models.User, db: Session) -> bool:
    """Check if user has access to program"""
    if current_user.role == models.UserRole.TRAINER:
        if program.user_id == current_user.id:
            return True
        # Check if client belongs to trainer
        client = db.query(models.User).filter(
            and_(
                models.User.id == program.user_id,
                models.User.trainer_id == current_user.id
            )
        ).first()
        return client is not None
    else:
        return program.user_id == current_user.id


@router.put(
    "/{program_id}/days/{day_id}",
    response_model=schemas.ProgramDayResponse,
    summary="Обновить день программы",
    description="""
    Обновление дня программы (переименование и изменение порядка).
    
    **Параметры:**
    - `program_id` - ID программы
    - `day_id` - ID дня программы
    
    **Права доступа:**
    - Тренер может обновлять дни в своих программах и программах своих клиентов
    - Клиент может обновлять дни только в своих программах
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
async def update_program_day(
    program_id: str,
    day_id: str,
    day_update: ProgramDayUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить день программы (переименование)"""
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    if not _check_program_access(program, current_user, db):
        raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    day = db.query(models.ProgramDay).filter(
        and_(
            models.ProgramDay.id == day_id,
            models.ProgramDay.program_id == program_id
        )
    ).first()
    
    if not day:
        raise HTTPException(status_code=404, detail="День программы не найден")
    
    update_data = day_update.model_dump(exclude_unset=True)
    if "name" in update_data:
        day.name = update_data["name"]
    if "order" in update_data:
        day.order = update_data["order"]
    
    db.commit()
    db.refresh(day)
    return day


@router.post(
    "/{program_id}/days/{day_id}/blocks/{block_id}/exercises",
    status_code=status.HTTP_201_CREATED,
    response_model=ProgramExerciseResponseNumeric,
    summary="Добавить упражнение в блок",
    description="""
    Добавление упражнения в блок дня программы.
    
    **Параметры:**
    - `program_id` - ID программы
    - `day_id` - ID дня программы
    - `block_id` - ID блока дня программы
    
    **Формат данных:**
    - `rest` передается как integer (секунды)
    - `duration` передается как integer (минуты)
    - `weight` передается как float (кг)
    
    В базе данных эти значения хранятся как строки с единицами измерения.
    
    **Права доступа:**
    - Тренер может добавлять упражнения в дни своих программ и программ своих клиентов
    - Клиент может добавлять упражнения в дни только своих программ
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
async def create_program_exercise(
    program_id: str,
    day_id: str,
    block_id: str,
    exercise_data: ProgramExerciseCreateNumeric,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Добавление упражнения в блок дня программы"""
    # Check program access
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    if not _check_program_access(program, current_user, db):
        raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    # Check day
    day = db.query(models.ProgramDay).filter(
        and_(
            models.ProgramDay.id == day_id,
            models.ProgramDay.program_id == program_id
        )
    ).first()
    
    if not day:
        raise HTTPException(status_code=404, detail="День программы не найден")
    
    # Check block
    block = db.query(models.ProgramBlock).filter(
        and_(
            models.ProgramBlock.id == block_id,
            models.ProgramBlock.day_id == day_id
        )
    ).first()
    
    if not block:
        raise HTTPException(status_code=404, detail="Блок не найден")
    
    # Get max order
    max_order = db.query(models.ProgramExercise).filter(
        models.ProgramExercise.block_id == block_id
    ).order_by(models.ProgramExercise.order.desc()).first()
    
    order = (max_order.order + 1) if max_order else 0
    
    # Create exercise
    exercise_id = str(uuid.uuid4())
    exercise_dict = exercise_data.model_dump()
    db_exercise = models.ProgramExercise(
        id=exercise_id,
        block_id=block_id,
        title=exercise_dict["title"],
        sets=exercise_dict["sets"],
        reps=exercise_dict.get("reps"),
        duration=_number_to_string(exercise_dict.get("duration"), "мин"),
        rest=_number_to_string(exercise_dict.get("rest"), "сек"),
        weight=_float_to_string(exercise_dict.get("weight"), "кг"),
        order=order
    )
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    
    return _exercise_to_numeric_response(db_exercise)


@router.put(
    "/{program_id}/days/{day_id}/blocks/{block_id}/exercises/{exercise_id}",
    response_model=ProgramExerciseResponseNumeric,
    summary="Обновить упражнение в блоке",
    description="""
    Обновление упражнения в блоке дня программы.
    
    **Параметры:**
    - `program_id` - ID программы
    - `day_id` - ID дня программы
    - `block_id` - ID блока дня программы
    - `exercise_id` - ID упражнения
    
    Все поля опциональные (частичное обновление).
    
    **Права доступа:**
    - Тренер может обновлять упражнения в днях своих программ и программ своих клиентов
    - Клиент может обновлять упражнения в днях только своих программ
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
async def update_program_exercise(
    program_id: str,
    day_id: str,
    block_id: str,
    exercise_id: str,
    exercise_update: ProgramExerciseUpdateNumeric,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновление упражнения в блоке дня программы"""
    # Check program access
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    if not _check_program_access(program, current_user, db):
        raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    # Check exercise
    exercise = db.query(models.ProgramExercise).filter(
        and_(
            models.ProgramExercise.id == exercise_id,
            models.ProgramExercise.block_id == block_id
        )
    ).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Упражнение не найдено")
    
    # Update fields
    update_data = exercise_update.model_dump(exclude_unset=True)
    if "title" in update_data:
        exercise.title = update_data["title"]
    if "sets" in update_data:
        exercise.sets = update_data["sets"]
    if "reps" in update_data:
        exercise.reps = update_data.get("reps")
    if "duration" in update_data:
        exercise.duration = _number_to_string(update_data.get("duration"), "мин")
    if "rest" in update_data:
        exercise.rest = _number_to_string(update_data.get("rest"), "сек")
    if "weight" in update_data:
        exercise.weight = _float_to_string(update_data.get("weight"), "кг")
    
    db.commit()
    db.refresh(exercise)
    
    return _exercise_to_numeric_response(exercise)


@router.delete(
    "/{program_id}/days/{day_id}/blocks/{block_id}/exercises/{exercise_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить упражнение из блока",
    description="""
    Удаление упражнения из блока дня программы.
    
    **Параметры:**
    - `program_id` - ID программы
    - `day_id` - ID дня программы
    - `block_id` - ID блока дня программы
    - `exercise_id` - ID упражнения
    
    **Права доступа:**
    - Тренер может удалять упражнения из дней своих программ и программ своих клиентов
    - Клиент может удалять упражнения из дней только своих программ
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
async def delete_program_exercise(
    program_id: str,
    day_id: str,
    block_id: str,
    exercise_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удаление упражнения из блока дня программы"""
    # Check program access
    program = db.query(models.TrainingProgram).filter(
        models.TrainingProgram.id == program_id
    ).first()
    
    if not program:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    
    if not _check_program_access(program, current_user, db):
        raise HTTPException(status_code=403, detail="Нет доступа к этой программе")

    # Проверка на удаление (клиент не может удалять из дней тренера)
    if current_user.role == models.UserRole.CLIENT:
        # Находим день чтобы проверить владельца
        day = db.query(models.ProgramDay).filter(models.ProgramDay.id == day_id).first()
        if day and day.owner == "trainer":
             raise HTTPException(status_code=403, detail="Нельзя удалить упражнение из тренировки тренера")
    
    # Check exercise
    exercise = db.query(models.ProgramExercise).filter(
        and_(
            models.ProgramExercise.id == exercise_id,
            models.ProgramExercise.block_id == block_id
        )
    ).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Упражнение не найдено")
    
    db.delete(exercise)
    db.commit()
    return None
