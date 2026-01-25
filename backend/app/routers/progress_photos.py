from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid
import os
import shutil
from pathlib import Path

from app.database import get_db
from app.auth import get_current_user
from app import models, schemas

router = APIRouter()

# Directory for storing uploaded photos
UPLOAD_DIR = Path("uploads/progress_photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Base URL for serving static files (in production, use CDN/S3)
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")


@router.get("/", response_model=List[schemas.ProgressPhotoResponse])
async def get_progress_photos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Получить все фото прогресса текущего пользователя"""
    photos = db.query(models.ProgressPhoto).filter(
        models.ProgressPhoto.user_id == current_user.id
    ).order_by(models.ProgressPhoto.date.desc()).all()
    
    return [
        schemas.ProgressPhotoResponse(
            id=photo.id,
            date=photo.date,
            url=photo.url,
            thumbnail_url=photo.url,  # В простой реализации thumbnail = original
            notes=photo.notes,
            created_at=photo.created_at,
        )
        for photo in photos
    ]


@router.post("/", response_model=schemas.ProgressPhotoResponse)
async def upload_progress_photo(
    file: UploadFile = File(...),
    date: str = Form(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Загрузить новое фото прогресса"""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/heic"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
    photo_id = str(uuid.uuid4())
    filename = f"{photo_id}.{file_ext}"
    
    # Create user-specific directory
    user_dir = UPLOAD_DIR / current_user.id
    user_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = user_dir / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Generate URL for the photo (relative)
    photo_url = f"/uploads/progress_photos/{current_user.id}/{filename}"
    
    # Parse date
    try:
        photo_date = datetime.fromisoformat(date.replace("Z", "+00:00"))
    except ValueError:
        # Try parsing as date only
        try:
            photo_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format or YYYY-MM-DD")
    
    # Create database record
    photo = models.ProgressPhoto(
        id=photo_id,
        user_id=current_user.id,
        date=photo_date,
        url=photo_url,
        notes=notes,
    )
    
    db.add(photo)
    db.commit()
    db.refresh(photo)
    
    return schemas.ProgressPhotoResponse(
        id=photo.id,
        date=photo.date,
        url=photo.url,
        thumbnail_url=photo.url,
        notes=photo.notes,
        created_at=photo.created_at,
    )


@router.delete("/{photo_id}")
async def delete_progress_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Удалить фото прогресса"""
    photo = db.query(models.ProgressPhoto).filter(
        models.ProgressPhoto.id == photo_id,
        models.ProgressPhoto.user_id == current_user.id,
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Try to delete the file from disk
    try:
        # Extract filename from URL
        url_parts = photo.url.split("/")
        filename = url_parts[-1]
        file_path = UPLOAD_DIR / current_user.id / filename
        if file_path.exists():
            file_path.unlink()
    except Exception:
        pass  # File deletion is not critical
    
    db.delete(photo)
    db.commit()
    
    return {"message": "Photo deleted successfully"}


@router.get("/{photo_id}", response_model=schemas.ProgressPhotoResponse)
async def get_progress_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Получить конкретное фото прогресса"""
    photo = db.query(models.ProgressPhoto).filter(
        models.ProgressPhoto.id == photo_id,
        models.ProgressPhoto.user_id == current_user.id,
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return schemas.ProgressPhotoResponse(
        id=photo.id,
        date=photo.date,
        url=photo.url,
        thumbnail_url=photo.url,
        notes=photo.notes,
        created_at=photo.created_at,
    )
