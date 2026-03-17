"""
Миграция: добавление колонки delivery_method в sms_verifications
"""
import os
import sys
import psycopg2

def get_db_url():
    return os.getenv("DATABASE_URL", "postgresql://coachflo:coachflo@localhost:5432/coachflo")

def migrate():
    db_url = get_db_url()
    print(f"Подключение к БД: {db_url}")
    
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    
    try:
        # Проверяем, существует ли колонка
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'sms_verifications' AND column_name = 'delivery_method'
        """)
        
        if cursor.fetchone():
            print("Колонка delivery_method уже существует. Пропускаем.")
        else:
            cursor.execute("""
                ALTER TABLE sms_verifications 
                ADD COLUMN delivery_method VARCHAR DEFAULT 'telegram'
            """)
            print("Колонка delivery_method добавлена успешно.")
        
    except Exception as e:
        print(f"Ошибка миграции: {e}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()
    
    print("Миграция завершена.")

if __name__ == "__main__":
    migrate()
