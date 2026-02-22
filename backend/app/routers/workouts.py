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
    
    # Проверяем, что program_day_id существует в таблице program_days (если указан)
    program_day_id = None
    if workout.program_day_id:
        program_day = db.query(models.ProgramDay).filter(
            models.ProgramDay.id == workout.program_day_id
        ).first()
        if not program_day:
            # Если program_day_id не найден, это может быть ID шаблона тренировки
            # В таком случае, не привязываем тренировку к несуществующему дню программы
            raise HTTPException(
                status_code=400, 
                detail=f"День программы с ID {workout.program_day_id} не найден. Возможно, был передан ID шаблона тренировки вместо ID дня программы."
            )
        # Проверяем права доступа к программе
        program = db.query(models.TrainingProgram).filter(
            models.TrainingProgram.id == program_day.program_id
        ).first()
        if program:
            if current_user.role == models.UserRole.TRAINER:
                if program.user_id != current_user.id:
                    # Проверяем, что это программа клиента тренера
                    client = db.query(models.User).filter(
                        and_(
                            models.User.id == program.user_id,
                            models.User.trainer_id == current_user.id
                        )
                    ).first()
                    if not client:
                        raise HTTPException(status_code=403, detail="Нет доступа к этому дню программы")
            else:
                # Клиент может использовать только свои программы
                if program.user_id != current_user.id:
                    raise HTTPException(status_code=403, detail="Нет доступа к этому дню программы")
        program_day_id = workout.program_day_id
    
    # Создаем основную тренировку
    db_workout = models.Workout(
        id=workout_id,
        user_id=user_id,
        title=workout.title,
        start=workout.start,
        end=workout.end,
        location=workout.location,
        format=workout.format,
        program_day_id=program_day_id,
        trainer_id=trainer_id,
        recurrence_series_id=series_id if workout.recurrence_frequency else None,
        recurrence_frequency=workout.recurrence_frequency,
        recurrence_interval=workout.recurrence_interval,
        recurrence_days_of_week=workout.recurrence_days_of_week,
        recurrence_end_date=workout.recurrence_end_date,
        recurrence_occurrences=workout.recurrence_occurrences
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
                    # Python weekday(): 0 = Mon, 6 = Sun
                    # JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
                    
                    # Convert JS days to Python days for easier calculation
                    # JS 0 (Sun) -> Py 6 (Sun)
                    # JS 1 (Mon) -> Py 0 (Mon)
                    # ...
                    py_target_days = [(d - 1) % 7 for d in workout.recurrence_days_of_week]
                    py_target_days.sort()
                    
                    current_py_day = current_date.weekday()
                    
                    # Find next day in the same week
                    next_days = [d for d in py_target_days if d > current_py_day]
                    
                    if next_days:
                        days_to_add = next_days[0] - current_py_day
                        current_date = current_date + timedelta(days=days_to_add)
                    else:
                        # Wrap around to next week's first allowed day and add interval minus 1
                        days_to_add = (7 - current_py_day) + py_target_days[0]
                        weeks_to_add = interval - 1
                        current_date = current_date + timedelta(days=days_to_add, weeks=weeks_to_add)
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
                program_day_id=program_day_id,
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
    
    # Check if we need to update balance
    status_changed_to_completed = (
        "attendance" in update_data and 
        update_data["attendance"] == models.AttendanceStatus.COMPLETED and
        workout.attendance != models.AttendanceStatus.COMPLETED
    )
    
    for field, value in update_data.items():
        setattr(workout, field, value)
    
    # Deduct from package if status changed to completed
    if status_changed_to_completed:
        client = db.query(models.User).filter(models.User.id == workout.user_id).first()
        if client and client.workouts_package is not None and client.workouts_package > 0:
            client.workouts_package -= 1
            
        # Также списываем с конкретного платежа (самого старого активного пакета)
        active_payment = db.query(models.Payment).filter(
            and_(
                models.Payment.client_id == workout.user_id,
                models.Payment.type == models.PaymentType.PACKAGE,
                models.Payment.remaining_sessions > 0
            )
        ).order_by(models.Payment.date.asc()).first()
        
        if active_payment:
            active_payment.remaining_sessions -= 1
    
    db.commit()
    db.refresh(workout)
    
    # Создаем уведомление для тренера, если клиент перенес тренировку
    if current_user.role == models.UserRole.CLIENT and workout.trainer_id:
        # Проверяем, изменилось ли время
        if "start" in update_data or "end" in update_data:
            notification = models.Notification(
                id=str(uuid.uuid4()),
                user_id=workout.trainer_id,
                sender_id=current_user.id,
                type="workout_rescheduled",
                title=f"Клиент {current_user.full_name} перенес тренировку",
                content=f"Тренировка '{workout.title}' перенесена на {workout.start.strftime('%d.%m.%Y %H:%M')}",
                link=f"/clients/{current_user.id}/calendar?workout_id={workout.id}"
            )
            db.add(notification)
            db.commit()
            
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

