from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func as sqlfunc
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from app.services.subscription_service import set_club_pro_status, revoke_club_pro_status
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel as PydanticBase
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


@router.get("/trainers/{trainer_id}/exercises", summary="Упражнения тренера клуба")
async def get_trainer_exercises(
    trainer_id: str,
    search: Optional[str] = Query(None),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Администратор клуба просматривает упражнения тренера."""
    club = get_admin_club(current_user, db)

    # Убедимся, что тренер состоит в клубе
    ct = db.query(models.ClubTrainer).filter(
        and_(
            models.ClubTrainer.club_id == club.id,
            models.ClubTrainer.trainer_id == trainer_id,
        )
    ).first()
    if not ct:
        raise HTTPException(status_code=404, detail="Тренер не состоит в клубе")

    query = db.query(models.Exercise).filter(models.Exercise.trainer_id == trainer_id)
    if search:
        query = query.filter(models.Exercise.name.ilike(f"%{search}%"))
    return query.order_by(models.Exercise.name).all()


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


# ─── Club Library — Workout Templates ─────────────────────────────────────────


class ClubTemplateCreate(PydanticBase):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None
    level: Optional[str] = None
    goal: Optional[str] = None
    muscle_groups: Optional[List[str]] = None
    equipment: Optional[List[str]] = None


class ClubTemplateResponse(PydanticBase):
    id: str
    club_id: str
    trainer_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None
    level: Optional[str] = None
    goal: Optional[str] = None
    muscle_groups: Optional[List[str]] = None
    equipment: Optional[List[str]] = None
    exercise_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


import json as _json


def _template_to_response(tpl: models.WorkoutTemplate) -> ClubTemplateResponse:
    return ClubTemplateResponse(
        id=tpl.id,
        club_id=tpl.club_id,
        trainer_id=tpl.trainer_id,
        title=tpl.title,
        description=tpl.description,
        duration=tpl.duration,
        level=tpl.level,
        goal=tpl.goal,
        muscle_groups=_json.loads(tpl.muscle_groups) if tpl.muscle_groups else None,
        equipment=_json.loads(tpl.equipment) if tpl.equipment else None,
        exercise_count=len(tpl.exercises),
        created_at=tpl.created_at,
    )


@router.get("/library/templates", summary="Шаблоны тренировок клуба")
async def get_club_templates(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Для admin: шаблоны своего клуба.
    Для тренера клуба: шаблоны клуба, к которому он принадлежит.
    """
    if current_user.role == models.UserRole.CLUB_ADMIN:
        club = get_admin_club(current_user, db)
        club_id = club.id
    elif current_user.role == models.UserRole.TRAINER:
        if not current_user.club_id:
            raise HTTPException(status_code=403, detail="Вы не состоите в клубе")
        club_id = current_user.club_id
    else:
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    templates = db.query(models.WorkoutTemplate).filter(
        models.WorkoutTemplate.club_id == club_id
    ).order_by(models.WorkoutTemplate.created_at.desc()).all()

    return [_template_to_response(t) for t in templates]


@router.post("/library/templates", status_code=status.HTTP_201_CREATED, summary="Создать шаблон для клуба")
async def create_club_template(
    data: ClubTemplateCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Администратор клуба создаёт шаблон тренировки, доступный всем тренерам."""
    club = get_admin_club(current_user, db)

    tpl = models.WorkoutTemplate(
        id=str(uuid.uuid4()),
        trainer_id=current_user.id,
        club_id=club.id,
        title=data.title,
        description=data.description,
        duration=data.duration,
        level=data.level,
        goal=data.goal,
        muscle_groups=_json.dumps(data.muscle_groups) if data.muscle_groups else None,
        equipment=_json.dumps(data.equipment) if data.equipment else None,
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return _template_to_response(tpl)


@router.delete("/library/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить шаблон клуба")
async def delete_club_template(
    template_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Только администратор клуба может удалить шаблон клуба."""
    club = get_admin_club(current_user, db)

    tpl = db.query(models.WorkoutTemplate).filter(
        models.WorkoutTemplate.id == template_id,
        models.WorkoutTemplate.club_id == club.id,
    ).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    db.delete(tpl)
    db.commit()


@router.post("/library/templates/{template_id}/copy", summary="Скопировать шаблон клуба в личную библиотеку")
async def copy_club_template(
    template_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Тренер копирует клубный шаблон в свою личную библиотеку."""
    if current_user.role != models.UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Только тренеры могут копировать шаблоны")
    if not current_user.club_id:
        raise HTTPException(status_code=403, detail="Вы не состоите в клубе")

    src = db.query(models.WorkoutTemplate).filter(
        models.WorkoutTemplate.id == template_id,
        models.WorkoutTemplate.club_id == current_user.club_id,
    ).first()
    if not src:
        raise HTTPException(status_code=404, detail="Шаблон не найден")

    copy = models.WorkoutTemplate(
        id=str(uuid.uuid4()),
        trainer_id=current_user.id,
        club_id=None,  # личная копия
        title=f"{src.title} (копия)",
        description=src.description,
        duration=src.duration,
        level=src.level,
        goal=src.goal,
        muscle_groups=src.muscle_groups,
        equipment=src.equipment,
    )
    db.add(copy)
    db.flush()

    for ex in src.exercises:
        db.add(models.WorkoutTemplateExercise(
            id=str(uuid.uuid4()),
            template_id=copy.id,
            exercise_id=ex.exercise_id,
            block_type=ex.block_type,
            sets=ex.sets,
            reps=ex.reps,
            duration=ex.duration,
            rest=ex.rest,
            weight=ex.weight,
            notes=ex.notes,
            order_index=ex.order_index,
        ))

    db.commit()
    db.refresh(copy)
    return _template_to_response(copy)


# ─── Club Library — Programs ───────────────────────────────────────────────────


class ClubProgramCreate(PydanticBase):
    title: str
    description: Optional[str] = None
    level: Optional[str] = None
    goal: Optional[str] = None
    duration_weeks: Optional[int] = None
    sessions_per_week: Optional[int] = None


class ClubProgramResponse(PydanticBase):
    id: str
    club_id: str
    creator_id: str
    title: str
    description: Optional[str] = None
    level: Optional[str] = None
    goal: Optional[str] = None
    duration_weeks: Optional[int] = None
    sessions_per_week: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/library/programs", summary="Программы клуба")
async def get_club_programs(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Возвращает программы клуба (для admin и тренеров клуба)."""
    if current_user.role == models.UserRole.CLUB_ADMIN:
        club = get_admin_club(current_user, db)
        club_id = club.id
    elif current_user.role == models.UserRole.TRAINER:
        if not current_user.club_id:
            raise HTTPException(status_code=403, detail="Вы не состоите в клубе")
        club_id = current_user.club_id
    else:
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    programs = db.query(models.ClubProgram).filter(
        models.ClubProgram.club_id == club_id
    ).order_by(models.ClubProgram.created_at.desc()).all()
    return programs


@router.post("/library/programs", status_code=status.HTTP_201_CREATED, summary="Создать программу клуба")
async def create_club_program(
    data: ClubProgramCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Администратор клуба создаёт программу тренировок для клуба."""
    club = get_admin_club(current_user, db)

    prog = models.ClubProgram(
        id=str(uuid.uuid4()),
        club_id=club.id,
        creator_id=current_user.id,
        title=data.title,
        description=data.description,
        level=data.level,
        goal=data.goal,
        duration_weeks=data.duration_weeks,
        sessions_per_week=data.sessions_per_week,
    )
    db.add(prog)
    db.commit()
    db.refresh(prog)
    return prog


@router.put("/library/programs/{program_id}", summary="Обновить программу клуба")
async def update_club_program(
    program_id: str,
    data: ClubProgramCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Только администратор клуба может редактировать программу."""
    club = get_admin_club(current_user, db)

    prog = db.query(models.ClubProgram).filter(
        models.ClubProgram.id == program_id,
        models.ClubProgram.club_id == club.id,
    ).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Программа не найдена")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(prog, field, value)
    db.commit()
    db.refresh(prog)
    return prog


@router.delete("/library/programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить программу клуба")
async def delete_club_program(
    program_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Только администратор клуба может удалить программу."""
    club = get_admin_club(current_user, db)

    prog = db.query(models.ClubProgram).filter(
        models.ClubProgram.id == program_id,
        models.ClubProgram.club_id == club.id,
    ).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    db.delete(prog)
    db.commit()
