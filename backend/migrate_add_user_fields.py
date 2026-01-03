"""
Скрипт для добавления новых полей в таблицу users
Запустите этот скрипт один раз для обновления схемы базы данных
"""
from sqlalchemy import text
from app.database import engine, get_db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Добавляет новые поля в таблицу users"""
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS client_format VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS workouts_package INTEGER",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS package_expiry_date TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
    ]
    
    try:
        with engine.connect() as conn:
            for migration in migrations:
                logger.info(f"Выполняю: {migration}")
                conn.execute(text(migration))
                conn.commit()
            
            # Обновляем существующие записи
            logger.info("Обновляю существующие записи...")
            conn.execute(text("UPDATE users SET is_active = TRUE WHERE is_active IS NULL"))
            conn.commit()
            
        logger.info("✅ Миграция успешно выполнена!")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка при выполнении миграции: {e}")
        return False

if __name__ == "__main__":
    print("Запуск миграции для добавления новых полей в таблицу users...")
    if migrate():
        print("Миграция завершена успешно!")
    else:
        print("Ошибка при выполнении миграции. Проверьте логи выше.")
        exit(1)

