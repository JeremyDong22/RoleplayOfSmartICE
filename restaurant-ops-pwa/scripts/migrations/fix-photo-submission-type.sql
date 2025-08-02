-- Fix submission_type for photo requirements
-- Updates "photo" to "拍照" to match the Chinese UI labels

UPDATE roleplay_tasks
SET submission_type = '拍照'
WHERE submission_type = 'photo';

-- Verify the update
SELECT id, title, submission_type 
FROM roleplay_tasks 
WHERE submission_type = '拍照'
ORDER BY sort_order;