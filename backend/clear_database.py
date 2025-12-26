"""
Скрипт для очистки базы данных
Удаляет все данные из всех таблиц (но не удаляет сами таблицы)

⚠️ ВНИМАНИЕ: Этот скрипт удалит ВСЕ данные из базы данных!
Используйте только для разработки!
"""
from sqlalchemy import text, inspect
from app.database import engine, Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clear_database():
    """Удаляет все данные из всех таблиц"""
    
    # Получаем список всех таблиц
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    # Порядок удаления важен из-за внешних ключей
    # Удаляем в обратном порядке зависимостей
    ordered_tables = [
        # Зависимые таблицы (с внешними ключами)
        'trainer_notes',
        'exercise_metric_entries',
        'body_metric_entries',
        'nutrition_entries',
        'payments',
        'program_exercises',
        'program_blocks',
        'program_days',
        'training_programs',
        'workouts',
        'exercises',
        'exercise_metrics',
        'body_metrics',
        'onboarding_restrictions',
        'onboarding_goals',
        'onboarding',
        'sms_verifications',
        'pending_registrations',
        # Основные таблицы
        'users',
    ]
    
    try:
        with engine.connect() as conn:
            # Отключаем проверку внешних ключей временно
            conn.execute(text("SET session_replication_role = 'replica';"))
            
            # Удаляем данные из таблиц
            for table in ordered_tables:
                if table in tables:
                    logger.info(f"Очищаю таблицу: {table}")
                    conn.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
                else:
                    logger.warning(f"Таблица {table} не найдена, пропускаю")
            
            # Включаем обратно проверку внешних ключей
            conn.execute(text("SET session_replication_role = 'origin';"))
            conn.commit()
            
        logger.info("✅ База данных успешно очищена!")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка при очистке базы данных: {e}")
        return False


def drop_all_tables():
    """
    Удаляет все таблицы из базы данных и пересоздает их
    ⚠️ ВНИМАНИЕ: Это удалит ВСЕ таблицы и данные!
    """
    try:
        logger.info("Удаляю все таблицы...")
        Base.metadata.drop_all(bind=engine)
        
        logger.info("Создаю таблицы заново...")
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ Таблицы успешно пересозданы!")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка при пересоздании таблиц: {e}")
        return False


if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("ОЧИСТКА БАЗЫ ДАННЫХ")
    print("=" * 60)
    print()
    print("Выберите действие:")
    print("1. Очистить данные из всех таблиц (сохранить структуру)")
    print("2. Удалить все таблицы и пересоздать их")
    print("3. Отмена")
    print()
    
    choice = input("Введите номер (1-3): ").strip()
    
    if choice == "1":
        confirm = input("⚠️  Вы уверены? Это удалит ВСЕ данные! (yes/no): ").strip().lower()
        if confirm == "yes":
            if clear_database():
                print("\n✅ База данных очищена!")
            else:
                print("\n❌ Ошибка при очистке!")
                sys.exit(1)
        else:
            print("Отменено.")
    elif choice == "2":
        confirm = input("⚠️  ВНИМАНИЕ: Это удалит ВСЕ таблицы и данные! (yes/no): ").strip().lower()
        if confirm == "yes":
            if drop_all_tables():
                print("\n✅ Таблицы пересозданы!")
            else:
                print("\n❌ Ошибка при пересоздании!")
                sys.exit(1)
        else:
            print("Отменено.")
    else:
        print("Отменено.")

