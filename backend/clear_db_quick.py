"""
Быстрая очистка базы данных - удаляет все данные из таблиц
Использует TRUNCATE для быстрой очистки

⚠️ ВНИМАНИЕ: Удалит ВСЕ данные!
"""
from sqlalchemy import text, inspect
from app.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    print("Очищаю данные из всех таблиц...")
    
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        with engine.connect() as conn:
            # Отключаем проверку внешних ключей временно
            conn.execute(text("SET session_replication_role = 'replica';"))
            
            # Очищаем все таблицы
            for table in tables:
                logger.info(f"Очищаю таблицу: {table}")
                try:
                    conn.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
                except Exception as e:
                    logger.warning(f"Не удалось очистить {table}: {e}")
            
            # Включаем обратно проверку внешних ключей
            conn.execute(text("SET session_replication_role = 'origin';"))
            conn.commit()
        
        print(f"✅ Очищено таблиц: {len(tables)}")
        print("✅ База данных очищена!")
        
    except Exception as e:
        logger.error(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

