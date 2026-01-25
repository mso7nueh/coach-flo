-- Fix: Convert absolute localhost URLs to relative URLs
UPDATE progress_photos
SET url = REPLACE(url, 'http://localhost:8000', '')
WHERE url LIKE 'http://localhost:8000%';

-- Also fix https if it happened
UPDATE progress_photos
SET url = REPLACE(url, 'https://localhost:8000', '')
WHERE url LIKE 'https://localhost:8000%';
