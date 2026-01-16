-- Миграция: Добавление новых таблиц и полей
-- Дата: 2024-01-XX
-- Описание: Добавляет таблицы для целей пользователей, фото прогресса, шаблонов тренировок
--           и новые поля в существующие таблицы

-- 1. Добавление поля timezone в таблицу users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(255);

-- 2. Создание таблицы user_goals (цели пользователей)
CREATE TABLE IF NOT EXISTS user_goals (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    headline VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    milestone VARCHAR(255) NOT NULL,
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    progress INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);

-- 3. Создание таблицы progress_photos (фото прогресса)
CREATE TABLE IF NOT EXISTS progress_photos (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_date ON progress_photos(date);

-- 4. Добавление новых полей в таблицу exercises
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS starting_position TEXT,
ADD COLUMN IF NOT EXISTS execution_instructions TEXT,
ADD COLUMN IF NOT EXISTS video_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS client_id VARCHAR(36);

-- Установка значения по умолчанию для существующих записей
UPDATE exercises SET visibility = 'all' WHERE visibility IS NULL;

-- Добавление внешнего ключа для client_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'exercises_client_id_fkey'
    ) THEN
        ALTER TABLE exercises
        ADD CONSTRAINT exercises_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exercises_client_id ON exercises(client_id);
CREATE INDEX IF NOT EXISTS idx_exercises_visibility ON exercises(visibility);

-- 5. Создание таблицы workout_templates (шаблоны тренировок)
CREATE TABLE IF NOT EXISTS workout_templates (
    id VARCHAR(36) PRIMARY KEY,
    trainer_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER,
    level VARCHAR(20),
    goal VARCHAR(20),
    muscle_groups TEXT,
    equipment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workout_templates_trainer_id ON workout_templates(trainer_id);

-- 6. Создание таблицы workout_template_exercises (упражнения в шаблонах)
CREATE TABLE IF NOT EXISTS workout_template_exercises (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    exercise_id VARCHAR(36) NOT NULL,
    block_type VARCHAR(20) NOT NULL,
    sets INTEGER NOT NULL,
    reps INTEGER,
    duration INTEGER,
    rest INTEGER,
    weight DECIMAL(10, 2),
    notes TEXT,
    order_index INTEGER NOT NULL,
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_template_id ON workout_template_exercises(template_id);
CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_exercise_id ON workout_template_exercises(exercise_id);

-- Комментарии для документации
COMMENT ON TABLE user_goals IS 'Цели пользователей с дедлайнами и прогрессом';
COMMENT ON TABLE progress_photos IS 'Фото прогресса пользователей';
COMMENT ON TABLE workout_templates IS 'Шаблоны тренировок для тренеров';
COMMENT ON TABLE workout_template_exercises IS 'Упражнения в шаблонах тренировок';
COMMENT ON COLUMN exercises.visibility IS 'Видимость упражнения: all, client, trainer';
COMMENT ON COLUMN exercises.client_id IS 'ID клиента, для которого упражнение доступно (если visibility=client)';
