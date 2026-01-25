#!/bin/bash
# Скрипт для применения исправления базы данных

set -e

echo "🚀 Применение исправления базы данных..."

# Проверка переменных окружения
if [ -z "$POSTGRES_USER" ]; then
    POSTGRES_USER="coachflo"
fi

if [ -z "$POSTGRES_DB" ]; then
    POSTGRES_DB="coachflo"
fi

if [ -z "$POSTGRES_HOST" ]; then
    POSTGRES_HOST="db"
fi

# Путь к файлу миграции
MIGRATION_FILE="migrations/fix_progress_photos_notes.sql"

echo "📋 Параметры подключения:"
echo "   Host: $POSTGRES_HOST"
echo "   Database: $POSTGRES_DB"
echo "   User: $POSTGRES_USER"
echo "   Migration file: $MIGRATION_FILE"

# Ожидание готовности базы данных
echo "⏳ Ожидание готовности базы данных..."
until pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    echo "   База данных не готова, ждем..."
    sleep 2
done

echo "✅ База данных готова"

# Применение миграции
echo "📝 Применение миграции..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Исправление успешно применено!"
else
    echo "❌ Ошибка при применении исправления"
    exit 1
fi
