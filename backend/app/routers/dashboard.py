from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from datetime import datetime, timedelta

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
    
    return {
        "total_workouts": total_workouts,
        "completed_workouts": completed_workouts,
        "attendance_rate": round(attendance_rate, 2),
        "today_workouts": today_workouts,
        "next_workout": next_workout if next_workout else None
    }

