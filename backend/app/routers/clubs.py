from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func as sqlfunc
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from app.services.subscription_service import set_club_pro_status, revoke_club_pro_status
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter()


def require_club_admin(current_user: models.User):
    """Проверяет, что пользователь — администратор клуба."""
    if current_user.role != models.UserRole.CLUB_ADMIN:
        raise HTTPException(status_code=403, detail="Доступ только для администраторов клуба")


def get_admin_club(current_user: models.User, db: Session) -> models.Club:
    """Возвращает клуб администратора. Если клуб не создан — создаёт его."""
    require_club_admin(current_user)
    club = db.query(models.Club).filter(models.Club.admin_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Клуб не найден. Создайте клуб через POST /api/clubs/")
    return club


# ─── Клуб ─────────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.ClubResponse, status_code=status.HTTP_201_CREATED,
             summary="Создать клуб")
async def create_club(
    data: schemas.ClubCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Создать новый клуб для текущего пользователя с ролью club_admin."""
    require_club_admin(current_user)

    existing = db.query(models.Club).filter(models.Club.admin_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Клуб уже создан")

    # Генерируем код приглашения для тренеров
    code = uuid.uuid4().hex[:8].upper()
    club = models.Club(
        id=str(uuid.uuid4()),
        name=data.name,
        admin_id=current_user.id,
        connection_code=code,
    )
    db.add(club)
    db.commit()
    db.refresh(club)
    return club


@router.get("/me", response_model=schemas.ClubResponse, summary="Мой клуб")
async def get_my_club(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Получить данные собственного клуба."""
    return get_admin_club(current_user, db)


# ─── Тренеры ──────────────────────────────────────────────────────────────────

@router.get("/trainers", response_model=List[schemas.ClubTrainerResponse],
            summary="Список тренеров клуба")
async def list_club_trainers(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Получить список всех тренеров клуба с агрегированной статистикой."""
    club = get_admin_club(current_user, db)

    club_trainers = (
        db.query(models.ClubTrainer)
        .filter(models.ClubTrainer.club_id == club.id)
        .all()
    )

    result = []
    for ct in club_trainers:
        trainer = ct.trainer
        # Кли
        clients = db.query(models.User).filter(models.User.trainer_id == trainer.id).all()
        active_clients = sum(1 for c in clients if c.is_active)

        # Тренировки
        total_workouts = db.query(models.Workout).filter(
            models.Workout.trainer_id == trainer.id
        ).count()
        completed_workouts = db.query(models.Workout).filter(
            and_(
                models.Workout.trainer_id == trainer.id,
                models.Workout.attendance == models.AttendanceStatus.COMPLETED,
            )
        ).count()

        # Выручка
        total_revenue = (
            db.query(sqlfunc.sum(models.Payment.amount))
            .filter(models.Payment.trainer_id == trainer.id)
            .scalar()
        ) or 0.0

        result.append(schemas.ClubTrainerResponse(
            id=trainer.id,
            email=trainer.email,
            full_name=trainer.full_name,
            phone=trainer.phone,
            avatar=trainer.avatar,
            connection_code=trainer.connection_code,
            total_clients=len(clients),
            active_clients=active_clients,
            total_workouts=total_workouts,
            completed_workouts=completed_workouts,
            total_revenue=total_revenue,
        ))

    return result


@router.post("/trainers", status_code=status.HTTP_201_CREATED,
             summary="Добавить тренера в клуб по connection_code")
async def add_trainer_to_club(
    body: dict,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Добавить тренера в клуб по его коду подключения (connection_code)."""
    club = get_admin_club(current_user, db)
    connection_code = body.get("connection_code", "").strip()
    if not connection_code:
        raise HTTPException(status_code=400, detail="connection_code обязателен")

    trainer = db.query(models.User).filter(
        and_(
            models.User.connection_code == connection_code,
            models.User.role == models.UserRole.TRAINER,
        )
    ).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Тренер с таким кодом не найден")

    # Проверяем, что тренер ещё не в клубе
    existing = db.query(models.ClubTrainer).filter(
        and_(
            models.ClubTrainer.club_id == club.id,
            models.ClubTrainer.trainer_id == trainer.id,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Тренер уже состоит в клубе")

    ct = models.ClubTrainer(
        id=str(uuid.uuid4()),
        club_id=club.id,
        trainer_id=trainer.id,
    )
    db.add(ct)

    # Устанавливаем тренеру club_id и Pro-подписку
    trainer.club_id = club.id
    db.commit()
    set_club_pro_status(trainer, db)

    return {"message": "Тренер успешно добавлен в клуб", "trainer_id": trainer.id}


@router.delete("/trainers/{trainer_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Убрать тренера из клуба")
async def remove_trainer_from_club(
    trainer_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Убрать тренера из клуба."""
    club = get_admin_club(current_user, db)
    ct = db.query(models.ClubTrainer).filter(
        and_(
            models.ClubTrainer.club_id == club.id,
            models.ClubTrainer.trainer_id == trainer_id,
        )
    ).first()
    if not ct:
        raise HTTPException(status_code=404, detail="Тренер не состоит в клубе")

    # Снимаем Pro и club_id у тренера
    trainer = db.query(models.User).filter(models.User.id == trainer_id).first()
    if trainer:
        trainer.club_id = None
        db.commit()
        revoke_club_pro_status(trainer, db)

    db.delete(ct)
    db.commit()


@router.get("/trainers/{trainer_id}", response_model=schemas.ClubTrainerResponse,
            summary="Карточка тренера")
async def get_trainer_card(
    trainer_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Получить карточку тренера клуба."""
    club = get_admin_club(current_user, db)

    ct = db.query(models.ClubTrainer).filter(
        and_(
            models.ClubTrainer.club_id == club.id,
            models.ClubTrainer.trainer_id == trainer_id,
        )
    ).first()
    if not ct:
        raise HTTPException(status_code=404, detail="Тренер не состоит в клубе")

    trainer = ct.trainer
    clients = db.query(models.User).filter(models.User.trainer_id == trainer.id).all()
    active_clients = sum(1 for c in clients if c.is_active)

    total_workouts = db.query(models.Workout).filter(
        models.Workout.trainer_id == trainer.id
    ).count()
    completed_workouts = db.query(models.Workout).filter(
        and_(
            models.Workout.trainer_id == trainer.id,
            models.Workout.attendance == models.AttendanceStatus.COMPLETED,
        )
    ).count()

    total_revenue = (
        db.query(sqlfunc.sum(models.Payment.amount))
        .filter(models.Payment.trainer_id == trainer.id)
        .scalar()
    ) or 0.0

    return schemas.ClubTrainerResponse(
        id=trainer.id,
        email=trainer.email,
        full_name=trainer.full_name,
        phone=trainer.phone,
        avatar=trainer.avatar,
        connection_code=trainer.connection_code,
        total_clients=len(clients),
        active_clients=active_clients,
        total_workouts=total_workouts,
        completed_workouts=completed_workouts,
        total_revenue=total_revenue,
    )


# ─── Calendar ─────────────────────────────────────────────────────────────────

@router.get("/calendar", response_model=List[schemas.WorkoutResponse],
            summary="Расписание клуба")
async def get_club_calendar(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Загрузить тренировки всех тренеров клуба за выбранный период."""
    club = get_admin_club(current_user, db)

    # Собираем ID тренеров клуба
    trainer_ids = [
        ct.trainer_id
        for ct in db.query(models.ClubTrainer)
        .filter(models.ClubTrainer.club_id == club.id)
        .all()
    ]
    if not trainer_ids:
        return []

    # По умолчанию — текущая неделя
    if not start_date:
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=now.weekday())  # Понедельник
    if not end_date:
        end_date = start_date + timedelta(days=7)

    workouts = (
        db.query(models.Workout)
        .filter(
            and_(
                models.Workout.trainer_id.in_(trainer_ids),
                models.Workout.start >= start_date,
                models.Workout.start <= end_date,
            )
        )
        .order_by(models.Workout.start)
        .all()
    )
    return workouts


# ─── Metrics ──────────────────────────────────────────────────────────────────

@router.get("/metrics", response_model=schemas.ClubMetricsResponse,
            summary="Метрики клуба")
async def get_club_metrics(
    period_days: int = Query(30, ge=7, le=365),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Получить агрегированные метрики клуба за выбранный период (MVP-набор)."""
    club = get_admin_club(current_user, db)

    since = datetime.now(timezone.utc) - timedelta(days=period_days)

    club_trainers = (
        db.query(models.ClubTrainer)
        .filter(models.ClubTrainer.club_id == club.id)
        .all()
    )
    if not club_trainers:
        return schemas.ClubMetricsResponse(period_days=period_days)

    trainer_metrics = []
    all_clients_ids: set = set()
    total_revenue = 0.0
    total_planned = 0
    total_conducted = 0

    for ct in club_trainers:
        trainer = ct.trainer
        clients = db.query(models.User).filter(models.User.trainer_id == trainer.id).all()
        all_clients_ids.update(c.id for c in clients)
        active_clients = sum(1 for c in clients if c.is_active)

        # Клиенты за период
        new_clients = db.query(models.User).filter(
            and_(
                models.User.trainer_id == trainer.id,
                models.User.created_at >= since,
            )
        ).count()

        # Тренировки за период
        planned = db.query(models.Workout).filter(
            and_(
                models.Workout.trainer_id == trainer.id,
                models.Workout.start >= since,
            )
        ).count()
        conducted = db.query(models.Workout).filter(
            and_(
                models.Workout.trainer_id == trainer.id,
                models.Workout.start >= since,
                models.Workout.attendance == models.AttendanceStatus.COMPLETED,
            )
        ).count()
        cancelled = db.query(models.Workout).filter(
            and_(
                models.Workout.trainer_id == trainer.id,
                models.Workout.start >= since,
                models.Workout.attendance == models.AttendanceStatus.MISSED,
            )
        ).count()

        occupancy_rate = round(conducted / planned * 100, 1) if planned > 0 else 0.0
        cancellation_rate = round(cancelled / planned * 100, 1) if planned > 0 else 0.0

        # Финансы за период
        revenue = (
            db.query(sqlfunc.sum(models.Payment.amount))
            .filter(
                and_(
                    models.Payment.trainer_id == trainer.id,
                    models.Payment.date >= since,
                )
            )
            .scalar()
        ) or 0.0
        payment_count = db.query(models.Payment).filter(
            and_(
                models.Payment.trainer_id == trainer.id,
                models.Payment.date >= since,
            )
        ).count()
        avg_check = round(revenue / payment_count, 2) if payment_count > 0 else 0.0

        total_revenue += revenue
        total_planned += planned
        total_conducted += conducted

        trainer_metrics.append(
            schemas.ClubTrainerMetrics(
                trainer_id=trainer.id,
                trainer_name=trainer.full_name,
                occupancy_rate=occupancy_rate,
                planned_workouts=planned,
                conducted_workouts=conducted,
                cancellation_rate=cancellation_rate,
                active_clients=active_clients,
                new_clients=new_clients,
                lost_clients=0,  # TODO: добавить логику ушедших клиентов
                revenue=revenue,
                avg_check=avg_check,
            )
        )

    avg_occupancy = (
        round(sum(m.occupancy_rate for m in trainer_metrics) / len(trainer_metrics), 1)
        if trainer_metrics else 0.0
    )

    return schemas.ClubMetricsResponse(
        period_days=period_days,
        total_trainers=len(club_trainers),
        total_clients=len(all_clients_ids),
        total_revenue=total_revenue,
        avg_occupancy_rate=avg_occupancy,
        total_workouts=total_planned,
        conducted_workouts=total_conducted,
        trainer_metrics=trainer_metrics,
    )
