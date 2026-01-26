"""
Скрипт для добавления полей description и video_url в таблицу program_exercises
"""
from sqlalchemy import text
from app.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Добавляет новые поля в таблицу program_exercises"""
    migrations = [
        "ALTER TABLE program_exercises ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE program_exercises ADD COLUMN IF NOT EXISTS video_url VARCHAR(500)",
    ]
    
    try:
        with engine.connect() as conn:
            for migration in migrations:
                logger.info(f"Выполняю: {migration}")
                conn.execute(text(migration))
                conn.commit()
            
        logger.info("✅ Миграция полей упражнений успешно выполнена!")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка при выполнении миграции: {e}")
        return False

if __name__ == "__main__":
    print("Запуск миграции для добавления полей в таблицу program_exercises...")
    if migrate():
        print("Миграция завершена успешно!")
    else:
        print("Ошибка при выполнении миграции. Проверьте логи выше.")
        exit(1)
