from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
import uuid

router = APIRouter()


@router.post("/", response_model=schemas.TrainingProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    program: schemas.TrainingProgramCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать программу тренировок"""
    program_id = str(uuid.uuid4())
    owner = "trainer" if current_user.role == models.UserRole.TRAINER else "client"
    
    db_program = models.TrainingProgram(
        id=program_id,
        user_id=current_user.id,
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
    if current_user.role == models.UserRole.TRAINER:
        # Тренер может удалять только свои программы (не программы клиентов)
        if program.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Тренер может удалять только свои программы")
    else:
        # Клиент может удалять только свои программы
        if program.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой программе")
    
    db.delete(program)
    db.commit()
    return None

