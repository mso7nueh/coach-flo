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
    """Renames columns in users and pending_registrations tables with diagnostics"""
    try:
        with engine.connect() as conn:
            # Diagnostic: List all columns in users table
            logger.info("Diagnostic: Listing columns in 'users' table...")
            cols_users = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users'")).fetchall()
            logger.info(f"Columns in 'users': {[c[0] for c in cols_users]}")

            # Diagnostic: List all columns in pending_registrations table
            logger.info("Diagnostic: Listing columns in 'pending_registrations' table...")
            cols_pending = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='pending_registrations'")).fetchall()
            logger.info(f"Columns in 'pending_registrations': {[c[0] for c in cols_pending]}")

            migrations = [
                {
                    "table": "users",
                    "old": "trainer_connection_code",
                    "new": "connection_code"
                },
                {
                    "table": "pending_registrations",
                    "old": "trainer_connection_code",
                    "new": "connection_code"
                }
            ]
            
            for m in migrations:
                table = m["table"]
                old_col = m["old"]
                new_col = m["new"]
                
                # Check for old column
                has_old = conn.execute(text(f"SELECT 1 FROM information_schema.columns WHERE table_name='{table}' AND column_name='{old_col}'")).fetchone()
                # Check for new column
                has_new = conn.execute(text(f"SELECT 1 FROM information_schema.columns WHERE table_name='{table}' AND column_name='{new_col}'")).fetchone()
                
                if has_old and not has_new:
                    logger.info(f"Renaming {old_col} to {new_col} in {table}...")
                    conn.execute(text(f"ALTER TABLE {table} RENAME COLUMN {old_col} TO {new_col}"))
                    conn.commit()
                    logger.info(f"Successfully renamed in {table}.")
                elif has_old and has_new:
                    logger.warning(f"Both {old_col} and {new_col} exist in {table}! Removing {old_col} and keeping {new_col}.")
                    conn.execute(text(f"ALTER TABLE {table} DROP COLUMN {old_col}"))
                    conn.commit()
                elif has_new:
                    logger.info(f"Column {new_col} already exists in {table}. No action needed.")
                else:
                    logger.error(f"Neither {old_col} nor {new_col} found in {table}!")
            
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
