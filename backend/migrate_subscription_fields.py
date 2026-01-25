"""
Скрипт для добавления полей подписки в таблицу users
"""
from sqlalchemy import text
from app.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Добавляет поля подписки в таблицу users"""
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS yookassa_payment_id VARCHAR(255)",
    ]
    
    try:
        with engine.connect() as conn:
            for migration in migrations:
                logger.info(f"Выполняю: {migration}")
                conn.execute(text(migration))
                conn.commit()
            
        logger.info("✅ Миграция полей подписки успешно выполнена!")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка при выполнении миграции: {e}")
        return False

if __name__ == "__main__":
    print("Запуск миграции для добавления полей подписки...")
    if migrate():
        print("Миграция завершена успешно!")
    else:
        print("Ошибка при выполнении миграции. Проверьте логи выше.")
        exit(1)
