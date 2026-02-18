"""
Script to rename trainer_connection_code to connection_code in users and pending_registrations tables.
Run this script once to update the database schema.
"""
from sqlalchemy import text
from app.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Renames columns in users and pending_registrations tables"""
    migrations = [
        # Check if column exists before renaming in users table
        {
            "check": "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='trainer_connection_code'",
            "execute": "ALTER TABLE users RENAME COLUMN trainer_connection_code TO connection_code"
        },
        # Check if column exists before renaming in pending_registrations table
        {
            "check": "SELECT column_name FROM information_schema.columns WHERE table_name='pending_registrations' AND column_name='trainer_connection_code'",
            "execute": "ALTER TABLE pending_registrations RENAME COLUMN trainer_connection_code TO connection_code"
        }
    ]
    
    try:
        with engine.connect() as conn:
            for m in migrations:
                # Check if the old column exists
                result = conn.execute(text(m["check"])).fetchone()
                if result:
                    logger.info(f"Executing: {m['execute']}")
                    conn.execute(text(m["execute"]))
                    conn.commit()
                    logger.info("Successfully renamed column.")
                else:
                    # Check if the new column already exists to avoid errors if already migrated
                    check_new = m["check"].replace("trainer_connection_code", "connection_code")
                    result_new = conn.execute(text(check_new)).fetchone()
                    if result_new:
                        logger.info(f"Column already renamed or exists as 'connection_code' in table.")
                    else:
                        logger.warning(f"Could not find either 'trainer_connection_code' or 'connection_code' in table.")
            
        logger.info("✅ Migration completed successfully!")
        return True
    except Exception as e:
        logger.error(f"❌ Error during migration: {e}")
        return False

if __name__ == "__main__":
    print("Starting migration to rename connection_code fields...")
    if migrate():
        print("Migration finished successfully!")
    else:
        print("Migration failed. Check logs above.")
        exit(1)
