"""
Скрипт для добавления недостающих полей в таблицу users.
Этот скрипт добавляет поля connection_code, timezone, trainer_id и phone_verified,
которые отсутствуют в некоторых версиях базы данных.
"""
from sqlalchemy import text
from app.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Добавляет недостающие поля в таблицу users"""
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS connection_code VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS trainer_id VARCHAR(36)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE",
    ]
    
    constraints = [
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_connection_code ON users(connection_code) WHERE connection_code IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_users_trainer_id ON users(trainer_id)",
    ]
    
    # Добавление внешнего ключа для trainer_id, если его нет
    foreign_key = """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'users_trainer_id_fkey'
        ) THEN
            ALTER TABLE users
            ADD CONSTRAINT users_trainer_id_fkey 
            FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END $$;
    """
    
    try:
        with engine.connect() as conn:
            # Выполняем добавление колонок
            for migration in migrations:
                logger.info(f"Выполняю: {migration}")
                conn.execute(text(migration))
                conn.commit()
            
            # Выполняем создание индексов
            for constraint in constraints:
                logger.info(f"Выполняю: {constraint}")
                conn.execute(text(constraint))
                conn.commit()
                
            # Выполняем добавление внешнего ключа
            logger.info("Проверяю внешний ключ users_trainer_id_fkey")
            conn.execute(text(foreign_key))
            conn.commit()
            
        logger.info("✅ Миграция недостающих полей успешно выполнена!")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка при выполнении миграции: {e}")
        return False

if __name__ == "__main__":
    print("Запуск миграции для исправления структуры таблицы users...")
    if migrate():
        print("Миграция завершена успешно!")
    else:
        print("Ошибка при выполнении миграции. Проверьте логи выше.")
        exit(1)
