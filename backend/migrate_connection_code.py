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
    """Renames columns in users and pending_registrations tables with diagnostics and data preservation"""
    try:
        with engine.connect() as conn:
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
                
                logger.info(f"Checking table '{table}' for columns '{old_col}' and '{new_col}'...")
                
                # Check for columns using direct SQL to be sure
                cols = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'")).fetchall()
                col_names = [c[0] for c in cols]
                
                has_old = old_col in col_names
                has_new = new_col in col_names
                
                logger.info(f"Existing columns in {table}: {col_names}")
                
                if has_old and not has_new:
                    logger.info(f"Renaming {old_col} to {new_col} in {table}...")
                    conn.execute(text(f"ALTER TABLE {table} RENAME COLUMN {old_col} TO {new_col}"))
                    conn.commit()
                    logger.info(f"Successfully renamed in {table}.")
                elif has_old and has_new:
                    logger.warning(f"Both {old_col} and {new_col} exist in {table}!")
                    # Move data if new column is empty
                    logger.info(f"Copying data from {old_col} to {new_col} where {new_col} is NULL...")
                    conn.execute(text(f"UPDATE {table} SET {new_col} = {old_col} WHERE {new_col} IS NULL AND {old_col} IS NOT NULL"))
                    
                    logger.info(f"Dropping old column {old_col}...")
                    conn.execute(text(f"ALTER TABLE {table} DROP COLUMN {old_col}"))
                    conn.commit()
                    logger.info(f"Successfully cleaned up {table}.")
                elif has_new:
                    logger.info(f"Column {new_col} already exists in {table}. No action needed.")
                else:
                    # Special case: maybe it was already renamed but hasn't been added yet?
                    # Or maybe it's just missing entirely.
                    if table == "users":
                        logger.warning(f"Neither column found in {table}. Adding {new_col}...")
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {new_col} VARCHAR(255)"))
                        conn.execute(text(f"CREATE UNIQUE INDEX IF NOT EXISTS ix_users_connection_code ON users ({new_col})"))
                        conn.commit()
                        logger.info(f"Successfully added column {new_col} to {table}.")
                    else:
                        logger.error(f"Neither {old_col} nor {new_col} found in {table}!")
                
                # Now, ensure all users have a connection code
                if table == "users":
                    logger.info("Checking for users with missing connection codes...")
                    missing_codes = conn.execute(text(f"SELECT id FROM {table} WHERE {new_col} IS NULL")).fetchall()
                    if missing_codes:
                        logger.info(f"Found {len(missing_codes)} users missing connection codes. Generating...")
                        import random
                        import string
                        for row in missing_codes:
                            user_id = row[0]
                            # Generate an 8-character uppercase alphanumeric code
                            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                            conn.execute(text(f"UPDATE {table} SET {new_col} = :code WHERE id = :id"), {"code": code, "id": user_id})
                        conn.commit()
                        logger.info("Successfully generated missing connection codes.")
                    else:
                        logger.info("All users have a connection code.")
            
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
