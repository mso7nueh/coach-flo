from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()


@router.get("/stats", response_model=schemas.DashboardStats)
async def get_dashboard_stats(
    period: str = "30d",  # 7d, 14d, 30d
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить статистику для дашборда"""
    # Вычисляем период
    days = int(period.replace("d", ""))
    start_date = datetime.now() - timedelta(days=days)
    
    # Общее количество тренировок за период
    total_workouts = db.query(func.count(models.Workout.id)).filter(
        and_(
            models.Workout.user_id == current_user.id,
            models.Workout.start >= start_date
        )
    ).scalar() or 0
    
    # Выполненные тренировки
    completed_workouts = db.query(func.count(models.Workout.id)).filter(
        and_(
            models.Workout.user_id == current_user.id,
            models.Workout.start >= start_date,
            models.Workout.attendance == models.AttendanceStatus.COMPLETED
        )
    ).scalar() or 0
    
    # Процент посещаемости
    attendance_rate = (completed_workouts / total_workouts * 100) if total_workouts > 0 else 0
    
    # Тренировки на сегодня
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    today_workouts = db.query(func.count(models.Workout.id)).filter(
        and_(
            models.Workout.user_id == current_user.id,
            models.Workout.start >= today_start,
            models.Workout.start < today_end
        )
    ).scalar() or 0
    
    # Ближайшая тренировка
    next_workout = db.query(models.Workout).filter(
        and_(
            models.Workout.user_id == current_user.id,
            models.Workout.start >= datetime.now()
        )
    ).order_by(models.Workout.start.asc()).first()
    
    # Получаем активную цель пользователя (ближайшую по дате)
    goal = None
    user_goal = db.query(models.UserGoal).filter(
        models.UserGoal.user_id == current_user.id
    ).order_by(models.UserGoal.target_date.asc()).first()
    
    if user_goal:
        days_left = (user_goal.target_date.date() - datetime.now().date()).days
        if days_left >= 0:  # Только если дедлайн еще не прошел
            goal = schemas.GoalResponse(
                headline=user_goal.headline,
                description=user_goal.description,
                milestone=user_goal.milestone,
                days_left=days_left,
                progress=user_goal.progress
            )
    
    # Получаем последние 2-3 фото прогресса
    progress_photos = db.query(models.ProgressPhoto).filter(
        models.ProgressPhoto.user_id == current_user.id
    ).order_by(models.ProgressPhoto.date.desc()).limit(3).all()
    
    return {
        "total_workouts": total_workouts,
        "completed_workouts": completed_workouts,
        "attendance_rate": round(attendance_rate, 2),
        "today_workouts": today_workouts,
        "next_workout": next_workout if next_workout else None,
        "goal": goal,
        "progress_photos": [
            schemas.ProgressPhotoResponse(
                id=photo.id,
                date=photo.date,
                url=photo.url
            ) for photo in progress_photos
        ]
    }

