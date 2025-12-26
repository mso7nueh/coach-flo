# Миграции базы данных

## Добавление новых полей в таблицу users

Если вы получили ошибку о том, что колонка не существует, выполните миграцию:

### Вариант 1: Через SQL скрипт

```bash
# Подключитесь к вашей базе данных и выполните:
psql -U your_username -d your_database -f migrations/add_user_fields.sql
```

Или через Docker:
```bash
docker exec -i coach-fit-db psql -U postgres -d coach_fit < migrations/add_user_fields.sql
```

### Вариант 2: Через psql напрямую

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_settings TEXT,
ADD COLUMN IF NOT EXISTS client_format VARCHAR(255),
ADD COLUMN IF NOT EXISTS workouts_package INTEGER,
ADD COLUMN IF NOT EXISTS package_expiry_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
```

### Вариант 3: Пересоздание таблиц (только для разработки!)

⚠️ **ВНИМАНИЕ:** Это удалит все данные!

```bash
# Удалите все таблицы и пересоздайте их
python -c "from app.database import Base, engine; Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine)"
```

Или через Python:
```python
from app.database import Base, engine
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
```

