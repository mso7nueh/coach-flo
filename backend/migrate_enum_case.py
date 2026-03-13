"""
Миграция: приведение значений enum userrole в PostgreSQL к нижнему регистру.

Проблема: enum type userrole в БД содержит значения в верхнем регистре
(CLIENT, TRAINER), а SQLAlchemy ожидает нижний (client, trainer, club_admin).

Решение: переименовываем существующие значения и добавляем club_admin.

Запуск: python migrate_enum_case.py
"""
import os
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://coachflo:coachflo@localhost:5432/coachflo"
)

engine = create_engine(DATABASE_URL)


def migrate():
    with engine.connect() as conn:
        # Шаг 1: Проверяем текущие значения enum
        result = conn.execute(text("""
            SELECT unnest(enum_range(NULL::userrole))::text AS val
        """))
        current_values = [row[0] for row in result]
        print(f"Текущие значения enum userrole: {current_values}")

        # Шаг 2: Определяем, нужна ли миграция
        has_uppercase = any(v.isupper() or v == 'CLUB_ADMIN' for v in current_values)
        has_lowercase = 'client' in current_values

        if has_lowercase and not has_uppercase:
            print("✅ Значения enum уже в нижнем регистре, миграция не требуется.")
            # Проверим наличие club_admin
            if 'club_admin' not in current_values:
                print("Добавляю club_admin...")
                conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'club_admin'"))
                conn.commit()
                print("✅ club_admin добавлен.")
            return

        if not has_uppercase:
            print("Не найдены значения в верхнем регистре. Проверьте вручную.")
            return

        print("🔄 Обнаружены значения в верхнем регистре. Начинаю миграцию...")

        # Шаг 3: Создаём новый enum с правильными значениями (нижний регистр)
        conn.execute(text("ALTER TYPE userrole RENAME TO userrole_old"))
        conn.commit()

        conn.execute(text("CREATE TYPE userrole AS ENUM ('client', 'trainer', 'club_admin')"))
        conn.commit()

        # Шаг 4: Обновляем столбец role — переводим в text, потом обратно в новый enum
        conn.execute(text("""
            ALTER TABLE users 
            ALTER COLUMN role TYPE text
        """))
        conn.commit()

        # Шаг 5: Конвертируем значения в нижний регистр
        conn.execute(text("""
            UPDATE users SET role = LOWER(role)
        """))
        conn.commit()

        # Шаг 6: Переключаем на новый enum
        conn.execute(text("""
            ALTER TABLE users 
            ALTER COLUMN role TYPE userrole USING role::userrole
        """))
        conn.commit()

        # Шаг 7: Удаляем старый enum
        conn.execute(text("DROP TYPE userrole_old"))
        conn.commit()

        print("✅ Миграция завершена! Все значения теперь в нижнем регистре.")

        # Проверка
        result = conn.execute(text("""
            SELECT unnest(enum_range(NULL::userrole))::text AS val
        """))
        new_values = [row[0] for row in result]
        print(f"Новые значения enum userrole: {new_values}")

        result = conn.execute(text("SELECT DISTINCT role::text FROM users"))
        used_values = [row[0] for row in result]
        print(f"Значения role в таблице users: {used_values}")


if __name__ == "__main__":
    migrate()
