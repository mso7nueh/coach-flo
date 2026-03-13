"""
Миграция: приведение значений enum userrole в PostgreSQL к нижнему регистру.
Обрабатывает ВСЕ таблицы, использующие этот enum (users, pending_registrations и др.)

Запуск: python migrate_enum_case.py
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
        # Проверяем, в каком состоянии мы находимся
        # (возможно скрипт уже частично выполнился ранее)
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'userrole_old'
            )
        """))
        has_old_type = result.scalar()

        if has_old_type:
            print("🔄 Обнаружен userrole_old — продолжаю прерванную миграцию...")

            # Найдём все таблицы/столбцы, которые всё ещё используют userrole_old
            result = conn.execute(text("""
                SELECT c.table_name, c.column_name
                FROM information_schema.columns c
                JOIN pg_type t ON c.udt_name = t.typname
                WHERE t.typname = 'userrole_old'
            """))
            dependent_columns = [(row[0], row[1]) for row in result]
            print(f"Столбцы, зависящие от userrole_old: {dependent_columns}")

            for table_name, column_name in dependent_columns:
                print(f"  → Конвертирую {table_name}.{column_name}...")
                conn.execute(text(f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" TYPE text'))
                conn.commit()
                conn.execute(text(f'UPDATE "{table_name}" SET "{column_name}" = LOWER("{column_name}")'))
                conn.commit()
                conn.execute(text(
                    f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" TYPE userrole USING "{column_name}"::userrole'
                ))
                conn.commit()
                print(f"  ✅ {table_name}.{column_name} сконвертирован")

            # Теперь можем удалить старый тип
            conn.execute(text("DROP TYPE IF EXISTS userrole_old"))
            conn.commit()
            print("✅ userrole_old удалён.")

        else:
            # Полная миграция с нуля
            result = conn.execute(text("""
                SELECT unnest(enum_range(NULL::userrole))::text AS val
            """))
            current_values = [row[0] for row in result]
            print(f"Текущие значения enum userrole: {current_values}")

            has_uppercase = any(v != v.lower() for v in current_values)
            if not has_uppercase:
                print("✅ Значения enum уже в нижнем регистре.")
                if 'club_admin' not in current_values:
                    conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'club_admin'"))
                    conn.commit()
                    print("✅ club_admin добавлен.")
                return

            print("🔄 Обнаружены значения в верхнем регистре. Начинаю миграцию...")

            # 1. Находим ВСЕ столбцы, зависящие от userrole
            result = conn.execute(text("""
                SELECT c.table_name, c.column_name
                FROM information_schema.columns c
                WHERE c.udt_name = 'userrole'
            """))
            dependent_columns = [(row[0], row[1]) for row in result]
            print(f"Столбцы, зависящие от userrole: {dependent_columns}")

            # 2. Переименовываем старый enum
            conn.execute(text("ALTER TYPE userrole RENAME TO userrole_old"))
            conn.commit()

            # 3. Создаём новый enum
            conn.execute(text("CREATE TYPE userrole AS ENUM ('client', 'trainer', 'club_admin')"))
            conn.commit()

            # 4. Конвертируем каждый столбец
            for table_name, column_name in dependent_columns:
                print(f"  → Конвертирую {table_name}.{column_name}...")
                conn.execute(text(f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" TYPE text'))
                conn.commit()
                conn.execute(text(f'UPDATE "{table_name}" SET "{column_name}" = LOWER("{column_name}")'))
                conn.commit()
                conn.execute(text(
                    f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" TYPE userrole USING "{column_name}"::userrole'
                ))
                conn.commit()
                print(f"  ✅ {table_name}.{column_name} сконвертирован")

            # 5. Удаляем старый enum
            conn.execute(text("DROP TYPE userrole_old"))
            conn.commit()

        # Финальная проверка
        result = conn.execute(text("SELECT unnest(enum_range(NULL::userrole))::text AS val"))
        new_values = [row[0] for row in result]
        print(f"\n✅ Миграция завершена!")
        print(f"Значения enum userrole: {new_values}")

        result = conn.execute(text("SELECT DISTINCT role::text FROM users"))
        used_values = [row[0] for row in result]
        print(f"Значения role в таблице users: {used_values}")


if __name__ == "__main__":
    migrate()
