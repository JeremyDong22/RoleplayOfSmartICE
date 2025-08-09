-- 修复单个任务的ID和period_id
-- 1. 先改回正确的period_id
UPDATE roleplay_tasks 
SET period_id = 'lunch-prep'
WHERE id = 'opening-manager-2';

-- 2. 更新所有相关表中的task_id引用
UPDATE roleplay_task_records 
SET task_id = 'lunch-prep-manager-0'
WHERE task_id = 'opening-manager-2';

-- 3. 最后更新任务本身的ID
UPDATE roleplay_tasks 
SET id = 'lunch-prep-manager-0'
WHERE id = 'opening-manager-2';