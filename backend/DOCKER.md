# Docker инструкции

## Быстрый старт

### Запуск всех сервисов

```bash
docker-compose up -d
```

Это запустит:
- PostgreSQL базу данных
- FastAPI приложение

### Остановка

```bash
docker-compose down
```

### Остановка с удалением данных

```bash
docker-compose down -v
```

## Полезные команды

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Только бэкенд
docker-compose logs -f backend

# Только база данных
docker-compose logs -f db
```

### Пересборка после изменений

```bash
docker-compose up -d --build
```

### Выполнение команд в контейнере

```bash
# Войти в контейнер бэкенда
docker-compose exec backend bash

# Выполнить команду Python
docker-compose exec backend python -c "print('Hello')"
```

### Подключение к базе данных

```bash
# Через docker-compose
docker-compose exec db psql -U coachfit -d coachfit

# Или напрямую
docker exec -it coachfit_db psql -U coachfit -d coachfit
```

## Переменные окружения

Создайте файл `.env` в папке `backend` для настройки (опционально):

```env
POSTGRES_USER=coachfit
POSTGRES_PASSWORD=coachfit
POSTGRES_DB=coachfit
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Или измените значения в `docker-compose.yml`.

## Проблемы и решения

### Порт уже занят

Если порт 8000 или 5432 уже занят, измените их в `docker-compose.yml`:

```yaml
ports:
  - "8001:8000"  # Внешний:Внутренний
```

### База данных не запускается

Проверьте логи:
```bash
docker-compose logs db
```

Убедитесь, что нет конфликтов с существующими контейнерами:
```bash
docker ps -a
docker rm coachfit_db  # если нужно
```

### Приложение не подключается к БД

Убедитесь, что:
1. База данных запущена: `docker-compose ps`
2. Healthcheck проходит: `docker-compose logs db | grep ready`
3. Переменные окружения правильные в `docker-compose.yml`

## Продакшен

Для продакшена рекомендуется:

1. Использовать `.env` файл для секретов (не коммитить в git)
2. Изменить `SECRET_KEY` на сильный случайный ключ
3. Использовать более безопасный пароль для PostgreSQL
4. Настроить резервное копирование базы данных
5. Использовать reverse proxy (Nginx) перед приложением
6. Настроить SSL сертификаты




