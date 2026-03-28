"""
Скрипт для добавления поля template_id в таблицу workouts
"""
from sqlalchemy import text
from app.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Добавляет поле template_id в таблицу workouts"""
    migrations = [
        "ALTER TABLE workouts ADD COLUMN IF NOT EXISTS template_id VARCHAR(255) REFERENCES workout_templates(id) ON DELETE SET NULL",
        "CREATE INDEX IF NOT EXISTS ix_workouts_template_id ON workouts (template_id)",
    ]

    try:
        with engine.connect() as conn:
            for migration in migrations:
                logger.info(f"Выполняю: {migration}")
                conn.execute(text(migration))
                conn.commit()

        logger.info("✅ Миграция template_id успешно выполнена!")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка при выполнении миграции: {e}")
        return False

if __name__ == "__main__":
    print("Запуск миграции для добавления template_id в таблицу workouts...")
    if migrate():
        print("Миграция завершена успешно!")
    else:
        print("Ошибка при выполнении миграции. Проверьте логи выше.")
        exit(1)
