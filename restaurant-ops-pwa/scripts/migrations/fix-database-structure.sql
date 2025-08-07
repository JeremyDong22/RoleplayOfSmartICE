-- 修复数据库结构和数据一致性问题
-- Created: 2025-08-07
-- Purpose: 修复任务排序、时段关系等问题

-- 1. 修复任务的 period_id 不一致问题
-- 例如: opening-manager-2 应该属于 opening 时段，而不是 lunch-prep
UPDATE roleplay_tasks
SET period_id = 'opening'
WHERE id = 'opening-manager-2' AND period_id != 'opening';

-- 2. 重置所有任务的 sort_order，按时段和角色分组排序
WITH task_ordering AS (
  SELECT 
    id,
    period_id,
    role_code,
    title,
    ROW_NUMBER() OVER (
      PARTITION BY period_id, role_code 
      ORDER BY 
        CASE 
          -- 前厅任务优先级
          WHEN role_code = 'manager' THEN
            CASE 
              WHEN title LIKE '%早会%' OR title LIKE '%午会%' THEN 1
              WHEN title LIKE '%现金%' THEN 2
              WHEN title LIKE '%准备%' THEN 3
              WHEN title LIKE '%验收%' AND title LIKE '%卫生%' THEN 4
              WHEN title LIKE '%验收%' AND title LIKE '%物资%' THEN 5
              WHEN title LIKE '%清洁%' THEN 6
              WHEN title LIKE '%能源%' THEN 7
              WHEN title LIKE '%营业款%' THEN 8
              WHEN title LIKE '%值班%' THEN 9
              WHEN title LIKE '%复盘%' OR title LIKE '%总结%' THEN 10
              ELSE 99
            END
          -- 后厨任务优先级
          WHEN role_code = 'chef' THEN
            CASE
              WHEN title LIKE '%准备%' THEN 1
              WHEN title LIKE '%晨会%' OR title LIKE '%分工%' THEN 2
              WHEN title LIKE '%食材%' AND title LIKE '%准备%' THEN 3
              WHEN title LIKE '%设备%' AND title LIKE '%运行%' THEN 4
              WHEN title LIKE '%人员%' THEN 5
              WHEN title LIKE '%清洁%' THEN 6
              WHEN title LIKE '%存储%' THEN 7
              WHEN title LIKE '%损耗%' THEN 8
              WHEN title LIKE '%下单%' THEN 9
              ELSE 99
            END
          -- 值班经理任务
          WHEN role_code = 'duty_manager' THEN
            CASE
              WHEN title LIKE '%能源%' THEN 1
              WHEN title LIKE '%安防%' THEN 2
              WHEN title LIKE '%营业数据%' THEN 3
              ELSE 99
            END
          ELSE 99
        END,
        title -- 相同优先级按标题排序
    ) as new_sort_order
  FROM roleplay_tasks
  WHERE is_active = true
)
UPDATE roleplay_tasks t
SET sort_order = to_new_sort_order
FROM task_ordering
WHERE t.id = task_ordering.id;

-- 3. 添加缺失的外键约束（如果需要）
-- 检查 period_id 是否有外键
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
      AND table_name = 'roleplay_tasks'
      AND constraint_name = 'roleplay_tasks_period_id_fkey'
  ) THEN
    ALTER TABLE roleplay_tasks
    ADD CONSTRAINT roleplay_tasks_period_id_fkey 
    FOREIGN KEY (period_id) 
    REFERENCES roleplay_workflow_periods(id);
  END IF;
END $$;

-- 4. 创建一个视图来简化 CEO 查询（使用 JOIN 而不是复制数据）
CREATE OR REPLACE VIEW v_ceo_dashboard_tasks AS
SELECT 
    tr.id as record_id,
    tr.restaurant_id,
    r.name as restaurant_name,
    tr.task_id,
    t.title as task_title,
    t.sort_order as task_sort_order,
    tr.user_id,
    u.full_name as user_name,
    t.role_code,
    ro.role_name_zh as role_name,
    CASE 
      WHEN t.role_code = 'chef' THEN '后厨'
      WHEN t.role_code IN ('manager', 'duty_manager') THEN '前厅'
      ELSE '前厅'
    END as department,
    tr.period_id,
    p.display_name as period_name,
    p.display_order as period_order,
    p.start_time as period_start_time,
    p.end_time as period_end_time,
    tr.date,
    tr.status,
    tr.is_late,
    tr.submission_type,
    tr.text_content,
    tr.photo_urls,
    tr.submission_metadata,
    tr.created_at,
    tr.scheduled_start,
    tr.actual_complete,
    -- 检查任务是否有错误（针对 checklist 类型）
    CASE 
        WHEN tr.submission_type = 'list' 
        AND tr.submission_metadata IS NOT NULL
        AND EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(tr.submission_metadata->'checklist') AS item
            WHERE item->>'status' IN ('fail', 'error')
        ) THEN true
        ELSE false
    END as has_errors
FROM roleplay_task_records tr
INNER JOIN roleplay_tasks t ON t.id = tr.task_id
INNER JOIN roleplay_restaurants r ON r.id = tr.restaurant_id
INNER JOIN roleplay_users u ON u.id = tr.user_id
LEFT JOIN roleplay_roles ro ON ro.code = t.role_code
INNER JOIN roleplay_workflow_periods p ON p.id = tr.period_id
WHERE tr.status IN ('submitted', 'completed');

-- 5. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_tasks_period_role_sort 
ON roleplay_tasks(period_id, role_code, sort_order);

CREATE INDEX IF NOT EXISTS idx_task_records_date_restaurant 
ON roleplay_task_records(date, restaurant_id);

-- 6. 授权
GRANT SELECT ON v_ceo_dashboard_tasks TO authenticated;
GRANT SELECT ON v_ceo_dashboard_tasks TO service_role;

-- 7. 添加注释说明
COMMENT ON VIEW v_ceo_dashboard_tasks IS 'CEO仪表板任务视图，包含所有必要的关联数据，避免在应用层重复查询';
COMMENT ON COLUMN v_ceo_dashboard_tasks.department IS '部门：根据role_code自动计算，chef=后厨，其他=前厅';
COMMENT ON COLUMN v_ceo_dashboard_tasks.has_errors IS '任务是否有错误：检查checklist类型任务中是否有fail或error状态的项目';