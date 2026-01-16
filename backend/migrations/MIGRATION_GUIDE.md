# Руководство по применению миграций на VPS сервере в Docker

## Быстрый способ (рекомендуется)

### Вариант 1: Через Docker exec (самый простой)

```bash
# 1. Подключитесь к вашему VPS серверу по SSH
ssh user@your-vps-ip

# 2. Перейдите в директорию проекта
cd /path/to/coach-flo/backend

# 3. Примените миграцию через Docker контейнер базы данных
docker exec -i coachfit_db psql -U coachfit -d coachfit < migrations/add_new_tables_and_fields.sql
```

### Вариант 2: Через Docker exec с интерактивным подключением

```bash
# Подключитесь к контейнеру базы данных
docker exec -it coachfit_db psql -U coachfit -d coachfit

# Затем выполните SQL команды вручную:
\i migrations/add_new_tables_and_fields.sql
# или скопируйте содержимое файла и вставьте
```

### Вариант 3: Через backend контейнер (если есть psql)

```bash
# Выполните команду в контейнере backend
docker exec -it coachfit_backend bash

# Внутри контейнера:
export PGPASSWORD=coachfit
psql -h db -U coachfit -d coachfit -f migrations/add_new_tables_and_fields.sql
```

### Вариант 4: Используя скрипт apply_migration.sh

```bash
# 1. Сделайте скрипт исполняемым
chmod +x migrations/apply_migration.sh

# 2. Запустите скрипт внутри backend контейнера
docker exec -it coachfit_backend bash -c "cd /app && ./migrations/apply_migration.sh"
```

## Подробная инструкция

### Шаг 1: Подготовка

1. **Подключитесь к VPS серверу:**
   ```bash
   ssh user@your-vps-ip
   ```

2. **Проверьте, что контейнеры запущены:**
   ```bash
   docker ps
   ```
   
   Должны быть видны контейнеры:
   - `coachfit_db` (база данных)
   - `coachfit_backend` (backend приложение)

3. **Проверьте, что файл миграции существует:**
   ```bash
   ls -la backend/migrations/add_new_tables_and_fields.sql
   ```

### Шаг 2: Резервное копирование (рекомендуется)

**⚠️ ВАЖНО: Сделайте backup базы данных перед применением миграции!**

```bash
# Создайте backup базы данных
docker exec coachfit_db pg_dump -U coachfit coachfit > backup_$(date +%Y%m%d_%H%M%S).sql

# Или с паролем:
docker exec coachfit_db pg_dump -U coachfit coachfit > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Шаг 3: Применение миграции

**Способ A: Прямое выполнение SQL (рекомендуется)**

```bash
# Скопируйте файл миграции в контейнер БД (если его там нет)
docker cp backend/migrations/add_new_tables_and_fields.sql coachfit_db:/tmp/migration.sql

# Выполните миграцию
docker exec coachfit_db psql -U coachfit -d coachfit -f /tmp/migration.sql
```

**Способ B: Через stdin**

```bash
# Если файл находится на хосте
cat backend/migrations/add_new_tables_and_fields.sql | docker exec -i coachfit_db psql -U coachfit -d coachfit
```

**Способ C: Интерактивный режим**

```bash
# Подключитесь к базе данных
docker exec -it coachfit_db psql -U coachfit -d coachfit

# В psql выполните:
\i /tmp/migration.sql
# или скопируйте содержимое файла и вставьте
```

### Шаг 4: Проверка результата

```bash
# Подключитесь к базе данных
docker exec -it coachfit_db psql -U coachfit -d coachfit

# Проверьте, что таблицы созданы:
\dt

# Должны быть видны новые таблицы:
# - user_goals
# - progress_photos
# - workout_templates
# - workout_template_exercises

# Проверьте структуру таблицы exercises:
\d exercises

# Должны быть видны новые поля:
# - starting_position
# - execution_instructions
# - video_url
# - notes
# - visibility
# - client_id

# Проверьте структуру таблицы users:
\d users

# Должно быть поле:
# - timezone

# Выйдите из psql:
\q
```

### Шаг 5: Перезапуск приложения (если нужно)

```bash
# Перезапустите backend контейнер для применения изменений
docker-compose restart backend

# Или если используете docker:
docker restart coachfit_backend
```

## Решение проблем

### Ошибка: "relation already exists"

Если таблица уже существует, миграция использует `CREATE TABLE IF NOT EXISTS`, поэтому ошибка не должна возникнуть. Если возникла, проверьте:

```bash
# Проверьте существующие таблицы
docker exec -it coachfit_db psql -U coachfit -d coachfit -c "\dt"
```

### Ошибка: "column already exists"

Если колонка уже существует, миграция использует `ADD COLUMN IF NOT EXISTS`, поэтому ошибка не должна возникнуть.

### Ошибка подключения к базе данных

```bash
# Проверьте, что контейнер БД запущен
docker ps | grep coachfit_db

# Проверьте логи
docker logs coachfit_db

# Проверьте переменные окружения
docker exec coachfit_db env | grep POSTGRES
```

### Ошибка прав доступа

```bash
# Убедитесь, что используете правильного пользователя
docker exec -it coachfit_db psql -U coachfit -d coachfit

# Если нужно создать пользователя:
docker exec -it coachfit_db psql -U postgres -c "CREATE USER coachfit WITH PASSWORD 'coachfit';"
docker exec -it coachfit_db psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE coachfit TO coachfit;"
```

## Автоматизация через docker-compose

Можно добавить в `docker-compose.yml` отдельный сервис для миграций:

```yaml
services:
  migrate:
    build: .
    command: >
      sh -c "
        /wait-for-db.sh db &&
        psql -h db -U coachfit -d coachfit -f migrations/add_new_tables_and_fields.sql
      "
    environment:
      POSTGRES_USER: coachfit
      POSTGRES_PASSWORD: coachfit
      POSTGRES_DB: coachfit
      POSTGRES_HOST: db
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
```

Затем запустите:
```bash
docker-compose run --rm migrate
```

## Откат миграции (rollback)

Если нужно откатить миграцию, создайте файл `rollback.sql`:

```sql
-- Откат миграции
DROP TABLE IF EXISTS workout_template_exercises;
DROP TABLE IF EXISTS workout_templates;
ALTER TABLE exercises DROP COLUMN IF EXISTS client_id;
ALTER TABLE exercises DROP COLUMN IF EXISTS visibility;
ALTER TABLE exercises DROP COLUMN IF EXISTS notes;
ALTER TABLE exercises DROP COLUMN IF EXISTS video_url;
ALTER TABLE exercises DROP COLUMN IF EXISTS execution_instructions;
ALTER TABLE exercises DROP COLUMN IF EXISTS starting_position;
DROP TABLE IF EXISTS progress_photos;
DROP TABLE IF EXISTS user_goals;
ALTER TABLE users DROP COLUMN IF EXISTS timezone;
```

И примените его тем же способом:
```bash
docker exec -i coachfit_db psql -U coachfit -d coachfit < migrations/rollback.sql
```

## Проверка версии миграции

Рекомендуется создать таблицу для отслеживания примененных миграций:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- После применения миграции:
INSERT INTO schema_migrations (version) VALUES ('add_new_tables_and_fields_2024-01-XX')
ON CONFLICT (version) DO NOTHING;
```
