-- Migration: add missing columns
-- Run with: docker exec -i coachflo_db psql -U postgres -d coachflo < migrate.sql

-- 1. Add club_id to training_programs
ALTER TABLE training_programs 
    ADD COLUMN IF NOT EXISTS club_id VARCHAR REFERENCES clubs(id) ON DELETE SET NULL;

-- 2. Add club_id to workout_templates
ALTER TABLE workout_templates 
    ADD COLUMN IF NOT EXISTS club_id VARCHAR REFERENCES clubs(id) ON DELETE SET NULL;

-- 3. Add club_id to exercises
ALTER TABLE exercises 
    ADD COLUMN IF NOT EXISTS club_id VARCHAR REFERENCES clubs(id) ON DELETE SET NULL;

-- 4. Add is_deleted and deleted_at to users (if not exists)
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

SELECT 'Migration complete!' as status;
