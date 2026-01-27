"""
Миграция для добавления таблицы dashboard_settings

Запуск: python migrate_dashboard_settings.py
"""
import asyncio
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://coach:coach@localhost:5432/coach_db")

def migrate():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Проверяем существует ли таблица
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'dashboard_settings'
            )
        """))
        exists = result.scalar()
        
        if exists:
            print("Таблица dashboard_settings уже существует")
            return
        
        # Создаем таблицу
        conn.execute(text("""
            CREATE TABLE dashboard_settings (
                id VARCHAR PRIMARY KEY,
                user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
                tile_ids TEXT,
                period VARCHAR(10) DEFAULT '7d',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        conn.execute(text("""
            CREATE INDEX ix_dashboard_settings_user_id ON dashboard_settings(user_id)
        """))
        
        conn.commit()
        print("Таблица dashboard_settings успешно создана")

if __name__ == "__main__":
    migrate()
