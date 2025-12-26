-- Миграция для добавления новых полей в таблицу users
-- Выполните этот SQL скрипт в вашей базе данных PostgreSQL

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_settings TEXT,
ADD COLUMN IF NOT EXISTS client_format VARCHAR(255),
ADD COLUMN IF NOT EXISTS workouts_package INTEGER,
ADD COLUMN IF NOT EXISTS package_expiry_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Обновляем существующие записи
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;

