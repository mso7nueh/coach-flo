from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user, get_password_hash
from typing import List, Optional
import uuid
from datetime import datetime

router = APIRouter()


@router.get("/", response_model=List[schemas.UserResponse])
async def get_clients(
    search: Optional[str] = Query(None, description="Поиск по имени"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить список клиентов (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать клиентов")
    
    query = db.query(models.User).filter(
        models.User.trainer_id == current_user.id
    )
    
    if search:
        query = query.filter(models.User.full_name.ilike(f"%{search}%"))
    
    clients = query.all()
    return clients


@router.get("/{client_id}", response_model=schemas.UserResponse)
async def get_client(
    client_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить информацию о клиенте (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать клиентов")
    
    client = db.query(models.User).filter(
        and_(
            models.User.id == client_id,
            models.User.trainer_id == current_user.id
        )
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    
    return client


@router.post("/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: schemas.UserCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Добавить клиента (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут добавлять клиентов")
    
    # Проверка уникальности email
    existing_user = db.query(models.User).filter(
        models.User.email == client_data.email
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
    
    # Проверка уникальности телефона, если указан
    if client_data.phone:
        existing_user = db.query(models.User).filter(
            models.User.phone == client_data.phone
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Пользователь с таким телефоном уже существует")
    
    client_id = str(uuid.uuid4())
    
    db_client = models.User(
        id=client_id,
        full_name=client_data.full_name,
        email=client_data.email,
        phone=client_data.phone,
        hashed_password=get_password_hash(client_data.password),
        role=models.UserRole.CLIENT,
        trainer_id=current_user.id,
        onboarding_seen=False,
        phone_verified=False
    )
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return schemas.UserResponse.model_validate(db_client)


@router.put("/{client_id}", response_model=schemas.UserResponse)
async def update_client(
    client_id: str,
    client_update: schemas.ClientUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить данные клиента (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут обновлять данные клиентов")
    
    client = db.query(models.User).filter(
        and_(
            models.User.id == client_id,
            models.User.trainer_id == current_user.id
        )
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    
    update_data = client_update.model_dump(exclude_unset=True)
    
    # Обновляем основные данные пользователя
    if "full_name" in update_data:
        client.full_name = update_data["full_name"]
    if "email" in update_data:
        if update_data["email"] != client.email:
            existing_user = db.query(models.User).filter(
                models.User.email == update_data["email"]
            ).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email уже используется")
            client.email = update_data["email"]
    if "phone" in update_data:
        if update_data["phone"] != client.phone:
            existing_user = db.query(models.User).filter(
                models.User.phone == update_data["phone"]
            ).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Телефон уже используется")
            client.phone = update_data["phone"]
    if "avatar" in update_data:
        client.avatar = update_data["avatar"]
    if "client_format" in update_data:
        client.client_format = update_data["client_format"]
    if "workouts_package" in update_data:
        client.workouts_package = update_data["workouts_package"]
    if "package_expiry_date" in update_data:
        client.package_expiry_date = update_data["package_expiry_date"]
    if "is_active" in update_data:
        client.is_active = update_data["is_active"]
    
    # Обновляем данные онбординга, если они указаны
    onboarding_fields = ["weight", "height", "age", "goals", "restrictions", "activity_level"]
    has_onboarding_data = any(field in update_data for field in onboarding_fields)
    
    if has_onboarding_data:
        onboarding = db.query(models.Onboarding).filter(
            models.Onboarding.user_id == client_id
        ).first()
        
        if not onboarding:
            # Создаем онбординг, если его нет
            onboarding_id = str(uuid.uuid4())
            onboarding = models.Onboarding(
                id=onboarding_id,
                user_id=client_id,
                weight=update_data.get("weight"),
                height=update_data.get("height"),
                age=update_data.get("age"),
                activity_level=update_data.get("activity_level")
            )
            db.add(onboarding)
            db.flush()
        else:
            # Обновляем существующий онбординг
            if "weight" in update_data:
                onboarding.weight = update_data["weight"]
            if "height" in update_data:
                onboarding.height = update_data["height"]
            if "age" in update_data:
                onboarding.age = update_data["age"]
            if "activity_level" in update_data:
                onboarding.activity_level = update_data["activity_level"]
            
            # Удаляем старые цели и ограничения
            db.query(models.OnboardingGoal).filter(
                models.OnboardingGoal.onboarding_id == onboarding.id
            ).delete()
            db.query(models.OnboardingRestriction).filter(
                models.OnboardingRestriction.onboarding_id == onboarding.id
            ).delete()
        
        # Добавляем новые цели
        if "goals" in update_data and update_data["goals"]:
            for goal in update_data["goals"]:
                goal_obj = models.OnboardingGoal(
                    id=str(uuid.uuid4()),
                    onboarding_id=onboarding.id,
                    goal=goal
                )
                db.add(goal_obj)
        
        # Добавляем новые ограничения
        if "restrictions" in update_data and update_data["restrictions"]:
            for restriction in update_data["restrictions"]:
                restriction_obj = models.OnboardingRestriction(
                    id=str(uuid.uuid4()),
                    onboarding_id=onboarding.id,
                    restriction=restriction
                )
                db.add(restriction_obj)
    
    db.commit()
    db.refresh(client)
    return schemas.UserResponse.model_validate(client)


@router.get("/{client_id}/onboarding", response_model=schemas.OnboardingResponse)
async def get_client_onboarding(
    client_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить данные онбординга клиента (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать онбординг клиентов")
    
    client = db.query(models.User).filter(
        and_(
            models.User.id == client_id,
            models.User.trainer_id == current_user.id
        )
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    
    onboarding = db.query(models.Onboarding).filter(
        models.Onboarding.user_id == client_id
    ).first()
    
    if not onboarding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Онбординг не найден"
        )
    
    # Получаем цели и ограничения
    goals = [g.goal for g in db.query(models.OnboardingGoal).filter(
        models.OnboardingGoal.onboarding_id == onboarding.id
    ).all()]
    restrictions = [r.restriction for r in db.query(models.OnboardingRestriction).filter(
        models.OnboardingRestriction.onboarding_id == onboarding.id
    ).all()]
    
    return schemas.OnboardingResponse(
        id=onboarding.id,
        user_id=onboarding.user_id,
        weight=onboarding.weight,
        height=onboarding.height,
        age=onboarding.age,
        goals=goals,
        restrictions=restrictions,
        activity_level=onboarding.activity_level,
        created_at=onboarding.created_at
    )


@router.get("/{client_id}/stats", response_model=schemas.DashboardStats)
async def get_client_stats(
    client_id: str,
    period: str = Query("7d", description="Период статистики (7d, 14d, 30d)"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить статистику клиента (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут просматривать статистику")
    
    client = db.query(models.User).filter(
        and_(
            models.User.id == client_id,
            models.User.trainer_id == current_user.id
        )
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    
    # Определяем дату начала периода
    today = datetime.now()
    if period == "7d":
        start_date = today - timedelta(days=7)
    elif period == "14d":
        start_date = today - timedelta(days=14)
    elif period == "30d":
        start_date = today - timedelta(days=30)
    else:
        start_date = today - timedelta(days=7)
    
    # Статистика тренировок за период
    period_workouts_query = db.query(models.Workout).filter(
        and_(
            models.Workout.user_id == client_id,
            models.Workout.start >= start_date,
            models.Workout.start <= today
        )
    )
    
    total_workouts = period_workouts_query.count()
    completed_workouts = period_workouts_query.filter(
        models.Workout.attendance == models.AttendanceStatus.COMPLETED
    ).count()
    
    attendance_rate = (completed_workouts / total_workouts * 100) if total_workouts > 0 else 0
    
    # Тренировки на сегодня
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    today_workouts = db.query(models.Workout).filter(
        and_(
            models.Workout.user_id == client_id,
            models.Workout.start >= today_start,
            models.Workout.start <= today_end
        )
    ).count()
    
    # Ближайшая тренировка
    next_workout = db.query(models.Workout).filter(
        and_(
            models.Workout.user_id == client_id,
            models.Workout.start >= today
        )
    ).order_by(models.Workout.start.asc()).first()
    
    # Цель (берем первую активную)
    user_goal = db.query(models.UserGoal).filter(
        models.UserGoal.user_id == client_id
    ).order_by(models.UserGoal.created_at.desc()).first()
    
    goal_response = None
    if user_goal:
        days_left = (user_goal.target_date.date() - today.date()).days
        goal_response = schemas.GoalResponse(
            headline=user_goal.headline,
            description=user_goal.description,
            milestone=user_goal.milestone,
            days_left=days_left if days_left > 0 else 0,
            progress=user_goal.progress
        )
    
    # Фото прогресса (последние 4)
    photos = db.query(models.ProgressPhoto).filter(
        models.ProgressPhoto.user_id == client_id
    ).order_by(models.ProgressPhoto.date.desc()).limit(4).all()
    
    return schemas.DashboardStats(
        total_workouts=total_workouts,
        completed_workouts=completed_workouts,
        attendance_rate=round(attendance_rate, 2),
        today_workouts=today_workouts,
        next_workout=next_workout,
        goal=goal_response,
        progress_photos=photos
    )

