-- Update workflow periods in Supabase
-- 1. Delete pre-closing period
-- 2. Update closing period time to 21:30-08:00
-- 3. Fix display order

-- First, delete the pre-closing period
DELETE FROM roleplay_workflow_periods WHERE id = 'pre-closing';

-- Update closing period to start at 21:30
UPDATE roleplay_workflow_periods 
SET 
    start_time = '21:30',
    end_time = '08:00',
    display_order = 7
WHERE id = 'closing';

-- Update display orders for all periods to ensure proper sequence
UPDATE roleplay_workflow_periods SET display_order = 1 WHERE id = 'opening';
UPDATE roleplay_workflow_periods SET display_order = 2 WHERE id = 'lunch-prep';
UPDATE roleplay_workflow_periods SET display_order = 3 WHERE id = 'lunch-service';
UPDATE roleplay_workflow_periods SET display_order = 4 WHERE id = 'lunch-closing';
UPDATE roleplay_workflow_periods SET display_order = 5 WHERE id = 'dinner-prep';
UPDATE roleplay_workflow_periods SET display_order = 6 WHERE id = 'dinner-service';
UPDATE roleplay_workflow_periods SET display_order = 7 WHERE id = 'closing';

-- Verify the changes
SELECT id, name, display_name, start_time, end_time, display_order 
FROM roleplay_workflow_periods 
ORDER BY display_order;