from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from pydantic import BaseModel
from typing import Optional, List
import json

router = APIRouter()


class NotificationSettings(BaseModel):
    emailEnabled: bool = True
    pushEnabled: bool = True
    smsEnabled: bool = False
    reminderBeforeMinutes: int = 30
    workoutReminders: bool = True
    workoutScheduled: bool = True
    workoutCompleted: bool = False
    metricsUpdate: bool = False
    trainerNote: bool = True


class UserSettingsResponse(BaseModel):
    locale: str
    notificationSettings: NotificationSettings

    class Config:
        from_attributes = True


@router.get("/", response_model=UserSettingsResponse)
async def get_user_settings(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить настройки пользователя"""
    notification_settings = NotificationSettings()
    if current_user.notification_settings:
        try:
            notification_settings = NotificationSettings(**json.loads(current_user.notification_settings))
        except:
            pass
    
    return UserSettingsResponse(
        locale=current_user.locale,
        notificationSettings=notification_settings
    )


@router.put("/", response_model=UserSettingsResponse)
async def update_user_settings(
    settings: UserSettingsResponse,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить настройки пользователя"""
    current_user.locale = settings.locale
    current_user.notification_settings = json.dumps(settings.notificationSettings.model_dump())
    
    db.commit()
    db.refresh(current_user)
    
    return UserSettingsResponse(
        locale=current_user.locale,
        notificationSettings=settings.notificationSettings
    )

