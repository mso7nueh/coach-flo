"""
Простой скрипт для быстрой очистки базы данных
Удаляет все таблицы и пересоздает их заново

⚠️ ВНИМАНИЕ: Удалит ВСЕ данные!
"""
from sqlalchemy import text, inspect
from app.database import Base, engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clear_database_force():
    """Принудительно удаляет все таблицы и пересоздает их"""
    try:
        with engine.connect() as conn:
            # Отключаем проверку внешних ключей
            conn.execute(text("SET session_replication_role = 'replica';"))
            
            # Получаем список всех таблиц
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
            if tables:
                logger.info(f"Найдено таблиц: {len(tables)}")
                # Удаляем все таблицы
                for table in tables:
                    logger.info(f"Удаляю таблицу: {table}")
                    conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
            
            # Включаем обратно проверку внешних ключей
            conn.execute(text("SET session_replication_role = 'origin';"))
            conn.commit()
            
        logger.info("Таблицы удалены. Создаю заново...")
        
        # Создаем таблицы заново
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ Готово! База данных очищена и пересоздана.")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("ОЧИСТКА БАЗЫ ДАННЫХ")
    print("=" * 60)
    print()
    confirm = input("⚠️  ВНИМАНИЕ: Это удалит ВСЕ данные! Продолжить? (yes/no): ").strip().lower()
    
    if confirm == "yes":
        if clear_database_force():
            print("\n✅ База данных успешно очищена и пересоздана!")
        else:
            print("\n❌ Ошибка при очистке базы данных!")
            exit(1)
    else:
        print("Отменено.")

