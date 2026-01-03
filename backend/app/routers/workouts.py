from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

router = APIRouter()


@router.post("/", response_model=schemas.WorkoutResponse, status_code=status.HTTP_201_CREATED)
async def create_workout(
    workout: schemas.WorkoutCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать тренировку"""
    workout_id = str(uuid.uuid4())
    series_id = workout.recurrence_series_id or workout_id
    
    # Определяем user_id и trainer_id
    user_id = current_user.id
    trainer_id = None
    
    # Если тренер создает тренировку для клиента
    if current_user.role == models.UserRole.TRAINER:
        # Используем user_id из запроса или trainer_id (для обратной совместимости)
        client_id = workout.user_id or workout.trainer_id
        if client_id:
            # Проверяем, что указанный client_id принадлежит клиенту тренера
            client = db.query(models.User).filter(
                and_(
                    models.User.id == client_id,
                    models.User.trainer_id == current_user.id
                )
            ).first()
            if not client:
                raise HTTPException(status_code=404, detail="Клиент не найден или не связан с вами")
            user_id = client_id
            trainer_id = current_user.id
    elif workout.trainer_id:
        # Клиент создает тренировку с тренером
        trainer = db.query(models.User).filter(
            and_(
                models.User.id == workout.trainer_id,
                models.User.role == models.UserRole.TRAINER
            )
        ).first()
        if not trainer:
            raise HTTPException(status_code=404, detail="Тренер не найден")
        # Проверяем связь клиента с тренером
        if current_user.trainer_id != workout.trainer_id:
            raise HTTPException(status_code=403, detail="Вы не связаны с этим тренером")
        trainer_id = workout.trainer_id
    
    # Создаем основную тренировку
    db_workout = models.Workout(
        id=workout_id,
        user_id=user_id,
        title=workout.title,
        start=workout.start,
        end=workout.end,
        location=workout.location,
        format=workout.format,
        program_day_id=workout.program_day_id,
        trainer_id=trainer_id,
        recurrence_series_id=series_id if workout.recurrence_frequency else None
    )
    db.add(db_workout)
    
    # Если есть правило повторения, создаем серию тренировок
    if workout.recurrence_frequency:
        start_date = workout.start
        end_date = workout.recurrence_end_date
        occurrences = workout.recurrence_occurrences or 52
        interval = workout.recurrence_interval or 1
        duration = (workout.end - workout.start).total_seconds() / 60
        
        count = 1
        current_date = start_date
        
        while count < occurrences:
            if end_date and current_date >= end_date:
                break
                
            # Вычисляем следующую дату
            if workout.recurrence_frequency == "daily":
                current_date = current_date + timedelta(days=interval)
            elif workout.recurrence_frequency == "weekly":
                if workout.recurrence_days_of_week:
                    # Находим следующий день недели
                    current_day = current_date.weekday()
                    next_days = [d for d in workout.recurrence_days_of_week if d > current_day]
                    if next_days:
                        days_to_add = next_days[0] - current_day
                    else:
                        days_to_add = (7 - current_day) + workout.recurrence_days_of_week[0]
                    current_date = current_date + timedelta(days=days_to_add)
                else:
                    current_date = current_date + timedelta(weeks=interval)
            elif workout.recurrence_frequency == "monthly":
                # Упрощенная логика: добавляем месяц
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
            
            if end_date and current_date > end_date:
                break
            
            # Создаем повторяющуюся тренировку
            new_workout = models.Workout(
                id=str(uuid.uuid4()),
                user_id=user_id,
                title=workout.title,
                start=current_date,
                end=current_date + timedelta(minutes=duration),
                location=workout.location,
                format=workout.format,
                program_day_id=workout.program_day_id,
                trainer_id=trainer_id,
                recurrence_series_id=series_id
            )
            db.add(new_workout)
            count += 1
    
    db.commit()
    db.refresh(db_workout)
    return db_workout


@router.get("/", response_model=List[schemas.WorkoutResponse])
async def get_workouts(
    start_date: Optional[datetime] = Query(None, description="Начало периода"),
    end_date: Optional[datetime] = Query(None, description="Конец периода"),
    client_id: Optional[str] = Query(None, description="ID клиента (только для тренеров)"),
    trainer_view: Optional[bool] = Query(False, description="Просмотр всех тренировок команды (только для тренеров)"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список тренировок"""
    if trainer_view and current_user.role == models.UserRole.TRAINER:
        # Тренер видит все тренировки своих клиентов
        query = db.query(models.Workout).join(
            models.User, models.Workout.user_id == models.User.id
        ).filter(
            models.User.trainer_id == current_user.id
        )
        
        if client_id:
            # Проверяем, что клиент принадлежит тренеру
            client = db.query(models.User).filter(
                and_(
                    models.User.id == client_id,
                    models.User.trainer_id == current_user.id
                )
            ).first()
            if not client:
                raise HTTPException(status_code=404, detail="Клиент не найден")
            query = query.filter(models.Workout.user_id == client_id)
    elif client_id and current_user.role == models.UserRole.TRAINER:
        # Тренер просматривает тренировки конкретного клиента
        client = db.query(models.User).filter(
            and_(
                models.User.id == client_id,
                models.User.trainer_id == current_user.id
            )
        ).first()
        if not client:
            raise HTTPException(status_code=404, detail="Клиент не найден")
        query = db.query(models.Workout).filter(models.Workout.user_id == client_id)
    else:
        # Клиент видит свои тренировки
        query = db.query(models.Workout).filter(models.Workout.user_id == current_user.id)
    
    if start_date:
        query = query.filter(models.Workout.start >= start_date)
    if end_date:
        query = query.filter(models.Workout.start <= end_date)
    
    workouts = query.order_by(models.Workout.start).all()
    return workouts


@router.get("/{workout_id}", response_model=schemas.WorkoutResponse)
async def get_workout(
    workout_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить тренировку по ID"""
    workout = db.query(models.Workout).filter(
        models.Workout.id == workout_id
    ).first()
    
    if not workout:
        raise HTTPException(status_code=404, detail="Тренировка не найдена")
    
    # Проверяем права доступа
    if current_user.role == models.UserRole.TRAINER:
        # Тренер может просматривать тренировки своих клиентов
        if workout.trainer_id != current_user.id:
            # Проверяем, что клиент принадлежит тренеру
            client = db.query(models.User).filter(
                and_(
                    models.User.id == workout.user_id,
                    models.User.trainer_id == current_user.id
                )
            ).first()
            if not client:
                raise HTTPException(status_code=403, detail="Нет доступа к этой тренировке")
    else:
        # Клиент может просматривать только свои тренировки
        if workout.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой тренировке")
    
    return workout


@router.put("/{workout_id}", response_model=schemas.WorkoutResponse)
async def update_workout(
    workout_id: str,
    workout_update: schemas.WorkoutUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить тренировку"""
    workout = db.query(models.Workout).filter(
        models.Workout.id == workout_id
    ).first()
    
    if not workout:
        raise HTTPException(status_code=404, detail="Тренировка не найдена")
    
    # Проверяем права доступа
    if current_user.role == models.UserRole.TRAINER:
        # Тренер может обновлять тренировки своих клиентов
        if workout.trainer_id != current_user.id:
            # Проверяем, что клиент принадлежит тренеру
            client = db.query(models.User).filter(
                and_(
                    models.User.id == workout.user_id,
                    models.User.trainer_id == current_user.id
                )
            ).first()
            if not client:
                raise HTTPException(status_code=403, detail="Нет доступа к этой тренировке")
    else:
        # Клиент может обновлять только свои тренировки
        if workout.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой тренировке")
    
    update_data = workout_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workout, field, value)
    
    db.commit()
    db.refresh(workout)
    return workout


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: str,
    delete_series: bool = Query(False, description="Удалить всю серию повторяющихся тренировок"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить тренировку"""
    workout = db.query(models.Workout).filter(
        models.Workout.id == workout_id
    ).first()
    
    if not workout:
        raise HTTPException(status_code=404, detail="Тренировка не найдена")
    
    # Проверяем права доступа
    if current_user.role == models.UserRole.TRAINER:
        # Тренер может удалять тренировки своих клиентов
        if workout.trainer_id != current_user.id:
            # Проверяем, что клиент принадлежит тренеру
            client = db.query(models.User).filter(
                and_(
                    models.User.id == workout.user_id,
                    models.User.trainer_id == current_user.id
                )
            ).first()
            if not client:
                raise HTTPException(status_code=403, detail="Нет доступа к этой тренировке")
    else:
        # Клиент может удалять только свои тренировки
        if workout.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой тренировке")
    
    if delete_series and workout.recurrence_series_id:
        # Удаляем всю серию (с проверкой прав для каждой)
        series_workouts = db.query(models.Workout).filter(
            models.Workout.recurrence_series_id == workout.recurrence_series_id
        ).all()
        for w in series_workouts:
            if current_user.role == models.UserRole.TRAINER:
                if w.trainer_id == current_user.id or (w.user_id and db.query(models.User).filter(
                    and_(models.User.id == w.user_id, models.User.trainer_id == current_user.id)
                ).first()):
                    db.delete(w)
            else:
                if w.user_id == current_user.id:
                    db.delete(w)
    else:
        db.delete(workout)
    
    db.commit()
    return None

