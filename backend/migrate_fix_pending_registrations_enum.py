"""
Миграция: исправление enum userrole в таблице pending_registrations.

Проблема: таблица pending_registrations.role всё ещё использует старый тип userrole_old
с uppercase-значениями (TRAINER, CLIENT), а код отправляет lowercase (trainer, client).

Запуск: python migrate_fix_pending_registrations_enum.py

Или через Docker:
  docker compose exec coachflo_backend python migrate_fix_pending_registrations_enum.py
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://coachflo:coachflo@localhost:5432/coachflo"
)

engine = create_engine(DATABASE_URL)


def migrate():
    with engine.connect() as conn:
        # 1. Проверяем, существует ли userrole_old
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'userrole_old'
            )
        """))
        has_old_type = result.scalar()

        if has_old_type:
            print("🔄 Обнаружен userrole_old — ищу зависимые столбцы...")

            # Находим все столбцы, использующие userrole_old
            result = conn.execute(text("""
                SELECT c.table_name, c.column_name
                FROM information_schema.columns c
                WHERE c.udt_name = 'userrole_old'
            """))
            dependent_columns = [(row[0], row[1]) for row in result]
            print(f"Столбцы, зависящие от userrole_old: {dependent_columns}")

            if not dependent_columns:
                print("Нет зависимых столбцов, удаляю userrole_old...")
                conn.execute(text("DROP TYPE IF EXISTS userrole_old"))
                conn.commit()
                print("✅ userrole_old удалён.")
            else:
                for table_name, column_name in dependent_columns:
                    print(f"  → Конвертирую {table_name}.{column_name}...")
                    
                    # Шаг 1: Преобразуем в text
                    conn.execute(text(
                        f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" TYPE text'
                    ))
                    conn.commit()
                    
                    # Шаг 2: Приводим значения к lowercase
                    conn.execute(text(
                        f'UPDATE "{table_name}" SET "{column_name}" = LOWER("{column_name}")'
                    ))
                    conn.commit()
                    
                    # Шаг 3: Преобразуем в новый enum userrole
                    conn.execute(text(
                        f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" '
                        f'TYPE userrole USING "{column_name}"::userrole'
                    ))
                    conn.commit()
                    print(f"  ✅ {table_name}.{column_name} сконвертирован в userrole")

                # Удаляем старый тип
                conn.execute(text("DROP TYPE IF EXISTS userrole_old"))
                conn.commit()
                print("✅ userrole_old удалён.")
        else:
            print("ℹ️  userrole_old не найден.")

            # Проверяем, какой тип использует pending_registrations.role
            result = conn.execute(text("""
                SELECT c.udt_name
                FROM information_schema.columns c
                WHERE c.table_name = 'pending_registrations' AND c.column_name = 'role'
            """))
            row = result.fetchone()
            if row:
                current_type = row[0]
                print(f"pending_registrations.role использует тип: {current_type}")
                if current_type == 'userrole':
                    print("✅ Тип уже правильный (userrole).")
                else:
                    print(f"⚠️  Неожиданный тип: {current_type}. Пробую конвертировать...")
                    conn.execute(text(
                        'ALTER TABLE "pending_registrations" ALTER COLUMN "role" TYPE text'
                    ))
                    conn.commit()
                    conn.execute(text(
                        'UPDATE "pending_registrations" SET "role" = LOWER("role")'
                    ))
                    conn.commit()
                    conn.execute(text(
                        'ALTER TABLE "pending_registrations" ALTER COLUMN "role" '
                        'TYPE userrole USING "role"::userrole'
                    ))
                    conn.commit()
                    print("✅ pending_registrations.role сконвертирован в userrole.")
            else:
                print("⚠️  Таблица pending_registrations не найдена или не содержит столбец role.")

        # Финальная проверка
        print("\n--- Финальная проверка ---")
        
        # Проверяем значения enum
        result = conn.execute(text(
            "SELECT unnest(enum_range(NULL::userrole))::text AS val"
        ))
        enum_values = [row[0] for row in result]
        print(f"Значения enum userrole: {enum_values}")

        # Проверяем тип pending_registrations.role
        result = conn.execute(text("""
            SELECT c.udt_name
            FROM information_schema.columns c
            WHERE c.table_name = 'pending_registrations' AND c.column_name = 'role'
        """))
        row = result.fetchone()
        if row:
            print(f"pending_registrations.role тип: {row[0]}")
        
        # Проверяем, не осталось ли userrole_old
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'userrole_old'
            )
        """))
        if result.scalar():
            print("⚠️  userrole_old всё ещё существует!")
        else:
            print("✅ userrole_old отсутствует.")

        print("\n✅ Миграция завершена!")


if __name__ == "__main__":
    migrate()
