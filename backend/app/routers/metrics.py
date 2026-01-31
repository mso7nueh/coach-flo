from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()


# Body Metrics
@router.post(
    "/body",
    response_model=schemas.BodyMetricResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать метрику тела",
    description="""
    Создание новой метрики тела для отслеживания прогресса.
    
    **Параметры:**
    - `label` - название метрики (обязательное), например: "Вес", "Рост", "Процент жира"
    - `unit` - единица измерения (обязательное), например: "кг", "см", "%"
    - `target` - целевое значение метрики (опциональное)
    
    Метрика автоматически привязывается к текущему пользователю.
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
async def create_body_metric(
    metric: schemas.BodyMetricCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать метрику тела"""
    metric_id = str(uuid.uuid4())
    db_metric = models.BodyMetric(
        id=metric_id,
        user_id=current_user.id,
        label=metric.label,
        unit=metric.unit,
        target=metric.target
    )
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric


@router.get("/body", response_model=List[schemas.BodyMetricResponse])
async def get_body_metrics(
    user_id: Optional[str] = Query(None, description="ID пользователя (только для тренеров)"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список метрик тела"""
    # Тренеры могут просматривать метрики своих клиентов
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
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать метрики других пользователей")
    
    metrics = db.query(models.BodyMetric).filter(
        models.BodyMetric.user_id == target_user_id
    ).all()
    return metrics


@router.post("/body/entries", response_model=schemas.BodyMetricEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_body_metric_entry(
    entry: schemas.BodyMetricEntryCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Добавить запись метрики тела"""
    # Проверяем, что метрика принадлежит пользователю
    metric = db.query(models.BodyMetric).filter(
        and_(
            models.BodyMetric.id == entry.metric_id,
            models.BodyMetric.user_id == current_user.id
        )
    ).first()
    
    if not metric:
        raise HTTPException(status_code=404, detail="Метрика не найдена")
    
    entry_id = str(uuid.uuid4())
    db_entry = models.BodyMetricEntry(
        id=entry_id,
        metric_id=entry.metric_id,
        value=entry.value,
        recorded_at=entry.recorded_at
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.patch(
    "/body/{metric_id}/target",
    response_model=schemas.BodyMetricResponse,
    summary="Обновить целевое значение метрики тела",
)
async def update_body_metric_target(
    metric_id: str,
    payload: schemas.BodyMetricTargetUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Обновить целевое значение метрики и записать в историю изменений."""
    metric = db.query(models.BodyMetric).filter(
        and_(
            models.BodyMetric.id == metric_id,
            models.BodyMetric.user_id == current_user.id,
        )
    ).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Метрика не найдена")
    metric.target = payload.target
    history_id = str(uuid.uuid4())
    db_history = models.BodyMetricTargetHistory(
        id=history_id,
        metric_id=metric_id,
        target_value=payload.target,
        changed_at=datetime.now(timezone.utc),
    )
    db.add(db_history)
    db.commit()
    db.refresh(metric)
    return metric


@router.get(
    "/body/target-history",
    response_model=List[schemas.BodyMetricTargetHistoryResponse],
    summary="История изменения целевого значения метрики тела",
)
async def get_body_metric_target_history(
    metric_id: Optional[str] = Query(None, description="ID метрики"),
    user_id: Optional[str] = Query(None, description="ID пользователя (только для тренеров)"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Получить историю изменения целевого значения для метрики тела."""
    target_user_id = current_user.id
    if user_id and current_user.role == models.UserRole.TRAINER:
        client = db.query(models.User).filter(
            and_(
                models.User.id == user_id,
                models.User.trainer_id == current_user.id,
            )
        ).first()
        if not client:
            raise HTTPException(status_code=404, detail="Клиент не найден")
        target_user_id = user_id
    elif user_id and current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать метрики других пользователей")
    if not metric_id:
        return []
    metric = db.query(models.BodyMetric).filter(
        and_(
            models.BodyMetric.id == metric_id,
            models.BodyMetric.user_id == target_user_id,
        )
    ).first()
    if not metric:
        return []
    history = (
        db.query(models.BodyMetricTargetHistory)
        .filter(models.BodyMetricTargetHistory.metric_id == metric_id)
        .order_by(models.BodyMetricTargetHistory.changed_at.desc())
        .all()
    )
    return history


@router.get("/body/entries", response_model=List[schemas.BodyMetricEntryResponse])
async def get_body_metric_entries(
    metric_id: Optional[str] = Query(None, description="ID метрики"),
    user_id: Optional[str] = Query(None, description="ID пользователя (только для тренеров)"),
    start_date: Optional[datetime] = Query(None, description="Начало периода"),
    end_date: Optional[datetime] = Query(None, description="Конец периода"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить записи метрик тела"""
    # Тренеры могут просматривать метрики своих клиентов
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
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать метрики других пользователей")
    
    # Получаем все метрики пользователя
    metrics = db.query(models.BodyMetric).filter(
        models.BodyMetric.user_id == target_user_id
    ).all()
    metric_ids = [m.id for m in metrics]
    
    if not metric_ids:
        return []
    
    query = db.query(models.BodyMetricEntry).filter(
        models.BodyMetricEntry.metric_id.in_(metric_ids)
    )
    
    if metric_id:
        query = query.filter(models.BodyMetricEntry.metric_id == metric_id)
    if start_date:
        query = query.filter(models.BodyMetricEntry.recorded_at >= start_date)
    if end_date:
        query = query.filter(models.BodyMetricEntry.recorded_at <= end_date)
    
    entries = query.order_by(models.BodyMetricEntry.recorded_at.desc()).all()
    return entries


# Exercise Metrics
@router.post(
    "/exercise",
    response_model=schemas.ExerciseMetricResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать метрику упражнения",
    description="""
    Создание новой метрики упражнения для отслеживания прогресса по конкретным упражнениям.
    
    **Параметры:**
    - `label` - название упражнения (обязательное), например: "Жим лежа", "Приседания"
    - `muscle_group` - группа мышц (опциональное), например: "Грудь", "Ноги", "Спина"
    
    Метрика автоматически привязывается к текущему пользователю.
    После создания метрики можно добавлять записи (entries) с данными о весе, повторениях и подходах.
    
    **Требуется аутентификация:** Да (JWT токен)
    """
)
async def create_exercise_metric(
    metric: schemas.ExerciseMetricCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать метрику упражнения"""
    metric_id = str(uuid.uuid4())
    db_metric = models.ExerciseMetric(
        id=metric_id,
        user_id=current_user.id,
        label=metric.label,
        muscle_group=metric.muscle_group
    )
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric


@router.get("/exercise", response_model=List[schemas.ExerciseMetricResponse])
async def get_exercise_metrics(
    user_id: Optional[str] = Query(None, description="ID пользователя (только для тренеров)"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список метрик упражнений"""
    # Тренеры могут просматривать метрики своих клиентов
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
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать метрики других пользователей")
    
    metrics = db.query(models.ExerciseMetric).filter(
        models.ExerciseMetric.user_id == target_user_id
    ).all()
    return metrics


@router.post("/exercise/entries", response_model=schemas.ExerciseMetricEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise_metric_entry(
    entry: schemas.ExerciseMetricEntryCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Добавить запись метрики упражнения"""
    # Проверяем, что метрика принадлежит пользователю
    metric = db.query(models.ExerciseMetric).filter(
        and_(
            models.ExerciseMetric.id == entry.exercise_metric_id,
            models.ExerciseMetric.user_id == current_user.id
        )
    ).first()
    
    if not metric:
        raise HTTPException(status_code=404, detail="Метрика не найдена")
    
    entry_id = str(uuid.uuid4())
    db_entry = models.ExerciseMetricEntry(
        id=entry_id,
        exercise_metric_id=entry.exercise_metric_id,
        date=entry.date,
        weight=entry.weight,
        repetitions=entry.repetitions,
        sets=entry.sets
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.get("/exercise/entries", response_model=List[schemas.ExerciseMetricEntryResponse])
async def get_exercise_metric_entries(
    exercise_metric_id: Optional[str] = Query(None, description="ID метрики упражнения"),
    user_id: Optional[str] = Query(None, description="ID пользователя (только для тренеров)"),
    start_date: Optional[datetime] = Query(None, description="Начало периода"),
    end_date: Optional[datetime] = Query(None, description="Конец периода"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить записи метрик упражнений"""
    # Тренеры могут просматривать метрики своих клиентов
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
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать метрики других пользователей")
    
    # Получаем все метрики пользователя
    metrics = db.query(models.ExerciseMetric).filter(
        models.ExerciseMetric.user_id == target_user_id
    ).all()
    metric_ids = [m.id for m in metrics]
    
    if not metric_ids:
        return []
    
    query = db.query(models.ExerciseMetricEntry).filter(
        models.ExerciseMetricEntry.exercise_metric_id.in_(metric_ids)
    )
    
    if exercise_metric_id:
        query = query.filter(models.ExerciseMetricEntry.exercise_metric_id == exercise_metric_id)
    if start_date:
        query = query.filter(models.ExerciseMetricEntry.date >= start_date)
    if end_date:
        query = query.filter(models.ExerciseMetricEntry.date <= end_date)
    
    entries = query.order_by(models.ExerciseMetricEntry.date.desc()).all()
    return entries

