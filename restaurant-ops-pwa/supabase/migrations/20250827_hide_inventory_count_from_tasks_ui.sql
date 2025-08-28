-- Hide inventory counting task from main tasks UI
-- This task will still be available in the inventory module
UPDATE roleplay_tasks
SET manual_closing = true
WHERE id = 'inventory-count-task-bc61c086-6b59-431c-8ae8-cc4b1e0fb9f0'
  OR title = '库存盘点';

-- Add comment to explain why this task is hidden
COMMENT ON COLUMN roleplay_tasks.manual_closing IS 
'When true, this task is hidden from the main tasks UI. Used for special tasks like manual closing and inventory counting that have dedicated UI elements.';