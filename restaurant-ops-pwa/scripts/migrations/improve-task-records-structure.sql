-- Migration to improve task records structure
-- Created: 2025-08-07
-- Purpose: Add role_code and department columns to task_records for better data clarity

-- 1. Add role_code column to task_records
ALTER TABLE roleplay_task_records 
ADD COLUMN IF NOT EXISTS role_code VARCHAR(50);

-- 2. Update existing records with role_code from tasks table
UPDATE roleplay_task_records r
SET role_code = t.role_code
FROM roleplay_tasks t
WHERE r.task_id = t.id
  AND r.role_code IS NULL;

-- 3. Add department as a generated column (computed from role_code)
ALTER TABLE roleplay_task_records 
ADD COLUMN IF NOT EXISTS department VARCHAR(20) GENERATED ALWAYS AS (
  CASE 
    WHEN role_code = 'chef' THEN '后厨'
    WHEN role_code IN ('manager', 'duty_manager') THEN '前厅'
    ELSE '前厅' -- Default to front office
  END
) STORED;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_records_restaurant_period 
ON roleplay_task_records(restaurant_id, period_id);

CREATE INDEX IF NOT EXISTS idx_task_records_restaurant_date_department 
ON roleplay_task_records(restaurant_id, date, department);

CREATE INDEX IF NOT EXISTS idx_tasks_restaurant_role 
ON roleplay_tasks(restaurant_id, role_code);

-- 5. Add comment to clarify the department mapping
COMMENT ON COLUMN roleplay_task_records.department IS 'Department derived from role_code: chef=后厨, others=前厅';

-- 6. Optional: Add department column to tasks table as well
ALTER TABLE roleplay_tasks 
ADD COLUMN IF NOT EXISTS department VARCHAR(20) GENERATED ALWAYS AS (
  CASE 
    WHEN role_code = 'chef' THEN '后厨'
    WHEN role_code IN ('manager', 'duty_manager') THEN '前厅'
    ELSE '前厅'
  END
) STORED;

-- 7. Create a view for easier CEO dashboard queries
CREATE OR REPLACE VIEW v_ceo_task_summary AS
SELECT 
    tr.id,
    tr.restaurant_id,
    r.name as restaurant_name,
    tr.task_id,
    t.title as task_title,
    tr.user_id,
    u.full_name as user_name,
    tr.role_code,
    tr.department,
    tr.period_id,
    p.display_name as period_name,
    tr.date,
    tr.status,
    tr.is_late,
    tr.submission_type,
    tr.created_at,
    CASE 
        WHEN tr.submission_type = 'list' AND tr.submission_metadata::jsonb @> '[{"status": "fail"}]'::jsonb THEN true
        ELSE false
    END as has_errors
FROM roleplay_task_records tr
LEFT JOIN roleplay_restaurants r ON r.id = tr.restaurant_id
LEFT JOIN roleplay_tasks t ON t.id = tr.task_id
LEFT JOIN roleplay_users u ON u.id = tr.user_id
LEFT JOIN roleplay_workflow_periods p ON p.id = tr.period_id
WHERE tr.status IN ('submitted', 'completed');

-- Grant permissions on the view
GRANT SELECT ON v_ceo_task_summary TO authenticated;
GRANT SELECT ON v_ceo_task_summary TO service_role;