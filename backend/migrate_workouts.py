"""
Скрипт для добавления полей повторений в таблицу workouts
"""
from sqlalchemy import text
from app.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Добавляет поля повторений (recurrence) в таблицу workouts"""
    migrations = [
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_series_id VARCHAR(255)",
        "CREATE INDEX IF NOT EXISTS ix_workouts_recurrence_series_id ON workouts (recurrence_series_id)",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR(50)",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_days_of_week INTEGER[]",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_occurrences INTEGER",
    ]
    
    try:
        with engine.connect() as conn:
            for migration in migrations:
                logger.info(f"Выполняю: {migration}")
                conn.execute(text(migration))
                conn.commit()
            
        logger.info("✅ Миграция полей повторений успешно выполнена!")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка при выполнении миграции: {e}")
        return False

if __name__ == "__main__":
    print("Запуск миграции для добавления полей повторений тренировок...")
    if migrate():
        print("Миграция завершена успешно!")
    else:
        print("Ошибка при выполнении миграции. Проверьте логи выше.")
        exit(1)
