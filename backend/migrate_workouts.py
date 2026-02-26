import traceback
import sys
from sqlalchemy import text
from app.database import engine

def add_columns():
    with engine.connect() as conn:
        try:
            # recurrence_series_id
            conn.execute(text("ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_series_id VARCHAR;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_workouts_recurrence_series_id ON workouts (recurrence_series_id);"))
            
            # recurrence_frequency
            conn.execute(text("ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR;"))
            
            # recurrence_interval
            conn.execute(text("ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER;"))
            
            # recurrence_days_of_week
            conn.execute(text("ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_days_of_week INTEGER[];"))
            
            # recurrence_end_date
            conn.execute(text("ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE;"))
            
            # recurrence_occurrences
            conn.execute(text("ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_occurrences INTEGER;"))
            
            conn.commit()
            print("Successfully added missing recurrence columns to workouts table.")
            
        except Exception as e:
            conn.rollback()
            print(f"Error executing migration: {e}")
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    add_columns()
