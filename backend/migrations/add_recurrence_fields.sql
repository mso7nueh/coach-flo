-- Добавление полей для хранения правил повторения тренировок в таблицу workouts
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_days_of_week INTEGER[];
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS recurrence_occurrences INTEGER;
