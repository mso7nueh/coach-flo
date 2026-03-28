-- Миграция: добавление поля template_id в таблицу workouts
-- Запустите этот скрипт на вашей PostgreSQL базе данных

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS template_id VARCHAR(255) REFERENCES workout_templates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_workouts_template_id ON workouts (template_id);
