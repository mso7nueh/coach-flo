"""
Роутер администратора системы — управление клубами и назначение club_admin.
Доступен только с секретным ключом ADMIN_SECRET из переменных окружения.
"""
from fastapi import APIRouter, Depends, HTTPException, Query as QueryParam
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
import os

from app.database import get_db
from app import models, schemas
from app.auth import get_password_hash

router = APIRouter()

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "change-me-in-production")


def require_admin(admin_secret: str = QueryParam(..., alias="secret")):
    """Проверка секретного ключа администратора через query-параметр ?secret=..."""
    if admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Недействительный ключ администратора")


# ─── Схемы ───────────────────────────────────────────────────────────────────

class AdminUserListItem(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    created_at: str

    class Config:
        from_attributes = True


class AdminClubListItem(BaseModel):
    id: str
    name: str
    admin_id: str
    admin_name: str
    admin_email: str
    trainers_count: int
    created_at: str


class CreateClubRequest(BaseModel):
    name: str
    admin_email: EmailStr


class AssignClubAdminRequest(BaseModel):
    user_email: EmailStr


class CreateClubAdminUserRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    club_name: Optional[str] = None  # Если задано — одновременно создаётся клуб


# ─── Пользователи ────────────────────────────────────────────────────────────

@router.get("/users", summary="Список всех пользователей")
def admin_list_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    q = db.query(models.User)
    if role:
        try:
            role_enum = models.UserRole(role)
            q = q.filter(models.User.role == role_enum)
        except ValueError:
            raise HTTPException(400, f"Неизвестная роль: {role}")
    if search:
        like = f"%{search}%"
        q = q.filter(
            models.User.full_name.ilike(like) | models.User.email.ilike(like)
        )
    total = q.count()
    users = q.order_by(models.User.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "phone": u.phone,
                "role": u.role.value,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.post("/users/club-admin", summary="Создать пользователя club_admin (+ опционально клуб)")
def admin_create_club_admin(
    req: CreateClubAdminUserRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    if db.query(models.User).filter(models.User.email == req.email).first():
        raise HTTPException(400, "Email уже зарегистрирован")

    user = models.User(
        id=str(uuid.uuid4()),
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
        hashed_password=get_password_hash(req.password),
        role=models.UserRole.CLUB_ADMIN,
        connection_code=str(uuid.uuid4())[:8].upper(),
    )
    db.add(user)
    db.flush()  # получаем user.id до commit

    club = None
    if req.club_name:
        club = models.Club(
            id=str(uuid.uuid4()),
            name=req.club_name,
            admin_id=user.id,
            connection_code=str(uuid.uuid4())[:8].upper(),
        )
        db.add(club)

    db.commit()
    db.refresh(user)

    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role.value,
        },
        "club": {
            "id": club.id,
            "name": club.name,
        } if club else None,
    }


@router.patch("/users/{user_id}/role", summary="Изменить роль пользователя")
def admin_change_user_role(
    user_id: str,
    role: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    try:
        user.role = models.UserRole(role)
    except ValueError:
        raise HTTPException(400, f"Неизвестная роль: {role}")
    db.commit()
    return {"id": user.id, "email": user.email, "role": user.role.value}


# ─── Клубы ───────────────────────────────────────────────────────────────────

@router.get("/clubs", summary="Список всех клубов")
def admin_list_clubs(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    clubs = db.query(models.Club).all()
    result = []
    for club in clubs:
        admin = db.query(models.User).filter(models.User.id == club.admin_id).first()
        trainers_count = db.query(models.ClubTrainer).filter(models.ClubTrainer.club_id == club.id).count()
        if search and search.lower() not in club.name.lower():
            continue
        result.append({
            "id": club.id,
            "name": club.name,
            "admin_id": club.admin_id,
            "admin_name": admin.full_name if admin else "—",
            "admin_email": admin.email if admin else "—",
            "trainers_count": trainers_count,
            "connection_code": club.connection_code,
            "created_at": club.created_at.isoformat() if club.created_at else None,
        })
    return result


@router.post("/clubs", summary="Создать клуб и назначить администратора")
def admin_create_club(
    req: CreateClubRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    admin_user = db.query(models.User).filter(models.User.email == req.admin_email).first()
    if not admin_user:
        raise HTTPException(404, f"Пользователь с email {req.admin_email} не найден")

    # Повышаем до club_admin если нужно
    if admin_user.role != models.UserRole.CLUB_ADMIN:
        admin_user.role = models.UserRole.CLUB_ADMIN

    club = models.Club(
        id=str(uuid.uuid4()),
        name=req.name,
        admin_id=admin_user.id,
        connection_code=str(uuid.uuid4())[:8].upper(),
    )
    db.add(club)
    db.commit()
    db.refresh(club)
    db.refresh(admin_user)

    return {
        "id": club.id,
        "name": club.name,
        "admin_email": admin_user.email,
        "admin_role": admin_user.role.value,
        "connection_code": club.connection_code,
    }


@router.patch("/clubs/{club_id}/admin", summary="Назначить нового администратора клуба")
def admin_reassign_club_admin(
    club_id: str,
    req: AssignClubAdminRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(404, "Клуб не найден")

    new_admin = db.query(models.User).filter(models.User.email == req.user_email).first()
    if not new_admin:
        raise HTTPException(404, f"Пользователь с email {req.user_email} не найден")

    new_admin.role = models.UserRole.CLUB_ADMIN
    club.admin_id = new_admin.id
    db.commit()
    return {"club_id": club.id, "new_admin_email": new_admin.email, "role": new_admin.role.value}


@router.delete("/clubs/{club_id}", summary="Удалить клуб")
def admin_delete_club(
    club_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(404, "Клуб не найден")
    db.delete(club)
    db.commit()
    return {"deleted": club_id}
