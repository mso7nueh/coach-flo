from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
from datetime import datetime, date
import uuid

router = APIRouter()


@router.post("/", response_model=schemas.NutritionEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_nutrition_entry(
    entry: schemas.NutritionEntryCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать запись питания"""
    # Проверяем, есть ли уже запись на эту дату
    # Нормализуем дату к началу дня для сравнения
    entry_date_start = entry.date.replace(hour=0, minute=0, second=0, microsecond=0)
    entry_date_end = entry_date_start.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    existing = db.query(models.NutritionEntry).filter(
        and_(
            models.NutritionEntry.user_id == current_user.id,
            models.NutritionEntry.date >= entry_date_start,
            models.NutritionEntry.date <= entry_date_end
        )
    ).first()
    
    if existing:
        # Обновляем существующую запись
        existing.calories = entry.calories
        existing.proteins = entry.proteins
        existing.fats = entry.fats
        existing.carbs = entry.carbs
        existing.notes = entry.notes
        db.commit()
        db.refresh(existing)
        return existing
    
    entry_id = str(uuid.uuid4())
    db_entry = models.NutritionEntry(
        id=entry_id,
        user_id=current_user.id,
        date=entry.date,
        calories=entry.calories,
        proteins=entry.proteins,
        fats=entry.fats,
        carbs=entry.carbs,
        notes=entry.notes
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.get("/", response_model=List[schemas.NutritionEntryResponse])
async def get_nutrition_entries(
    start_date: Optional[datetime] = Query(None, description="Начало периода"),
    end_date: Optional[datetime] = Query(None, description="Конец периода"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить записи питания"""
    query = db.query(models.NutritionEntry).filter(
        models.NutritionEntry.user_id == current_user.id
    )
    
    if start_date:
        query = query.filter(models.NutritionEntry.date >= start_date)
    if end_date:
        query = query.filter(models.NutritionEntry.date <= end_date)
    
    entries = query.order_by(models.NutritionEntry.date.desc()).all()
    return entries


@router.get("/{entry_id}", response_model=schemas.NutritionEntryResponse)
async def get_nutrition_entry(
    entry_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить запись питания по ID"""
    entry = db.query(models.NutritionEntry).filter(
        and_(
            models.NutritionEntry.id == entry_id,
            models.NutritionEntry.user_id == current_user.id
        )
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    
    return entry


@router.put("/{entry_id}", response_model=schemas.NutritionEntryResponse)
async def update_nutrition_entry(
    entry_id: str,
    entry_update: schemas.NutritionEntryCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить запись питания"""
    entry = db.query(models.NutritionEntry).filter(
        and_(
            models.NutritionEntry.id == entry_id,
            models.NutritionEntry.user_id == current_user.id
        )
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    
    entry.date = entry_update.date
    entry.calories = entry_update.calories
    entry.proteins = entry_update.proteins
    entry.fats = entry_update.fats
    entry.carbs = entry_update.carbs
    entry.notes = entry_update.notes
    
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nutrition_entry(
    entry_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить запись питания"""
    entry = db.query(models.NutritionEntry).filter(
        and_(
            models.NutritionEntry.id == entry_id,
            models.NutritionEntry.user_id == current_user.id
        )
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    
    db.delete(entry)
    db.commit()
    return None

