"""
Migration: Add soft-delete fields to users table.

Run with:
    python migrate_soft_delete.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine


def migrate():
    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('is_deleted', 'deleted_at')
        """))
        existing = {row[0] for row in result}

        if 'is_deleted' not in existing:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE"
            ))
            print("Added column: is_deleted")
        else:
            print("Column already exists: is_deleted")

        if 'deleted_at' not in existing:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE"
            ))
            print("Added column: deleted_at")
        else:
            print("Column already exists: deleted_at")

        conn.commit()
        print("Migration completed successfully.")


if __name__ == "__main__":
    migrate()
