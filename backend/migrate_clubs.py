"""
Миграция: добавление таблиц для функционала клубов

Запуск:
    cd backend
    python migrate_clubs.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine

def run_migration():
    with engine.connect() as conn:
        print("Добавляем значение 'club_admin' в тип userrole...")
        try:
            conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'club_admin'"))
            conn.commit()
            print("  ✓ Значение club_admin добавлено.")
        except Exception as e:
            print(f"  ℹ️  Уже существует или ошибка: {e}")
            conn.rollback()

        print("Создаём таблицу clubs...")
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS clubs (
                    id VARCHAR PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    admin_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
                    connection_code VARCHAR UNIQUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE
                )
            """))
            conn.commit()
            print("  ✓ Таблица clubs создана.")
        except Exception as e:
            print(f"  Ошибка: {e}")
            conn.rollback()

        print("Создаём таблицу club_trainers...")
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS club_trainers (
                    id VARCHAR PRIMARY KEY,
                    club_id VARCHAR NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
                    trainer_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                )
            """))
            conn.commit()
            print("  ✓ Таблица club_trainers создана.")
        except Exception as e:
            print(f"  Ошибка: {e}")
            conn.rollback()

        print("Добавляем колонку club_id в таблицу users...")
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS club_id VARCHAR REFERENCES clubs(id)
            """))
            conn.commit()
            print("  ✓ Колонка club_id добавлена.")
        except Exception as e:
            print(f"  Ошибка: {e}")
            conn.rollback()

    print("\nМиграция завершена!")


if __name__ == "__main__":
    run_migration()
