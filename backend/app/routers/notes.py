from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from typing import List, Optional
import uuid

router = APIRouter()


@router.post("/", response_model=schemas.TrainerNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: schemas.TrainerNoteCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Создать заметку для клиента (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут создавать заметки")
    
    # Проверяем, что клиент связан с тренером
    client = db.query(models.User).filter(
        and_(
            models.User.id == note.client_id,
            models.User.trainer_id == current_user.id
        )
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден или не связан с вами")
    
    note_id = str(uuid.uuid4())
    db_note = models.TrainerNote(
        id=note_id,
        trainer_id=current_user.id,
        client_id=note.client_id,
        title=note.title,
        content=note.content
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@router.get("/", response_model=List[schemas.TrainerNoteResponse])
async def get_notes(
    client_id: Optional[str] = Query(None, description="ID клиента"),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить заметки"""
    if current_user.role == models.UserRole.TRAINER:
        # Тренер видит свои заметки
        query = db.query(models.TrainerNote).filter(
            models.TrainerNote.trainer_id == current_user.id
        )
        if client_id:
            query = query.filter(models.TrainerNote.client_id == client_id)
    else:
        # Клиент видит заметки от своего тренера
        query = db.query(models.TrainerNote).filter(
            models.TrainerNote.client_id == current_user.id
        )
    
    notes = query.order_by(models.TrainerNote.updated_at.desc()).all()
    return notes


@router.get("/{note_id}", response_model=schemas.TrainerNoteResponse)
async def get_note(
    note_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить заметку по ID"""
    if current_user.role == models.UserRole.TRAINER:
        note = db.query(models.TrainerNote).filter(
            and_(
                models.TrainerNote.id == note_id,
                models.TrainerNote.trainer_id == current_user.id
            )
        ).first()
    else:
        note = db.query(models.TrainerNote).filter(
            and_(
                models.TrainerNote.id == note_id,
                models.TrainerNote.client_id == current_user.id
            )
        ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")
    
    return note


@router.put("/{note_id}", response_model=schemas.TrainerNoteResponse)
async def update_note(
    note_id: str,
    note_update: schemas.TrainerNoteUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновить заметку (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут обновлять заметки")
    
    note = db.query(models.TrainerNote).filter(
        and_(
            models.TrainerNote.id == note_id,
            models.TrainerNote.trainer_id == current_user.id
        )
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")
    
    update_data = note_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(note, field, value)
    
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удалить заметку (только для тренеров)"""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут удалять заметки")
    
    note = db.query(models.TrainerNote).filter(
        and_(
            models.TrainerNote.id == note_id,
            models.TrainerNote.trainer_id == current_user.id
        )
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")
    
    db.delete(note)
    db.commit()
    return None

