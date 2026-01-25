-- Fix: Add missing notes column to progress_photos table
ALTER TABLE progress_photos
ADD COLUMN IF NOT EXISTS notes TEXT;
