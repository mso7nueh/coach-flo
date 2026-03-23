"""
Сервис управления подписками.
Описание планов и лимиты клиентов.
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app import models

# ── Планы и лимиты ────────────────────────────────────────────────────────────

PLAN_LIMITS = {
    None: 5,           # Без подписки / триал — до 5 клиентов (starter)
    "starter": 5,
    "base": 12,
    "pro": 30,
    "enterprise": 999_999,
}

PLAN_NAMES = {
    None: "Триал (до 5 клиентов)",
    "starter": "Starter",
    "base": "Base",
    "pro": "Pro",
    "enterprise": "Enterprise",
}


def get_max_clients(trainer: models.User) -> int:
    """Возвращает максимальное количество клиентов для данного тренера."""
    plan = get_effective_plan(trainer)
    return PLAN_LIMITS.get(plan, 5)


def get_effective_plan(trainer: models.User) -> Optional[str]:
    """
    Возвращает эффективный план тренера.
    Если тренер состоит в клубе — возвращает 'pro' независимо от оплаченного плана.
    Если оплаченная подписка истекла — возвращает None (триал).
    """
    # 1. Тренер в клубе — всегда Pro
    if _is_club_trainer(trainer):
        return "pro"

    # 2. Платная подписка и она ещё активна
    if trainer.subscription_plan and _subscription_active(trainer):
        return trainer.subscription_plan

    return None  # триал


def _is_club_trainer(trainer: models.User) -> bool:
    """Проверяет, состоит ли тренер в клубе через relationship или club_id."""
    return bool(trainer.club_id)


def _subscription_active(trainer: models.User) -> bool:
    """Проверяет, не истекла ли подписка."""
    if not trainer.subscription_expires_at:
        return False
    expires = trainer.subscription_expires_at
    # Приводим оба к aware datetime для корректного сравнения
    now = datetime.now(timezone.utc)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires > now


def check_client_limit(trainer: models.User, db: Session) -> tuple[bool, str]:
    """
    Проверяет, не превышен ли лимит клиентов по плану тренера.
    Возвращает (ok: bool, error_message: str).
    """
    current_count = db.query(models.User).filter(
        models.User.trainer_id == trainer.id,
        models.User.is_active == True,
        models.User.is_deleted == False,
    ).count()

    max_clients = get_max_clients(trainer)
    if current_count >= max_clients:
        plan = get_effective_plan(trainer)
        plan_name = PLAN_NAMES.get(plan, plan or "Триал")
        return False, (
            f"Достигнут лимит клиентов для тарифного плана «{plan_name}» "
            f"({current_count}/{max_clients}). "
            f"Обновите тариф, чтобы добавить больше клиентов."
        )
    return True, ""


def set_club_pro_status(trainer: models.User, db: Session, commit: bool = True) -> None:
    """
    Устанавливает тренеру план 'pro' так как он состоит в клубе.
    Не затрагивает реальную платную подписку — только поле subscription_plan.
    """
    if trainer.subscription_plan != "pro":
        trainer.subscription_plan = "pro"
        if commit:
            db.commit()


def revoke_club_pro_status(trainer: models.User, db: Session, commit: bool = True) -> None:
    """
    Снимает Pro-статус у тренера при выходе/исключении из клуба.
    Если есть действующая платная подписка — оставляем её план.
    """
    # Если есть действующая платная подписка — не меняем план
    if trainer.subscription_plan and _subscription_active(trainer):
        # У тренера была реальная подписка до клуба — оставляем как есть
        return

    # Иначе сбрасываем в None (триал)
    trainer.subscription_plan = None
    if commit:
        db.commit()
