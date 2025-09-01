-- 将workflow_periods的ID从有意义的字符串改为UUID
-- 需要更新所有引用这些ID的地方

-- 1. 创建临时映射表
CREATE TEMP TABLE period_id_mapping (
    old_id VARCHAR(255),
    new_id UUID DEFAULT gen_random_uuid()
);

-- 2. 插入所有现有时段ID的映射
INSERT INTO period_id_mapping (old_id)
SELECT DISTINCT id FROM roleplay_workflow_periods;

-- 3. 更新所有引用period_id的表
-- 3.1 更新tasks表中的period_id
UPDATE roleplay_tasks t
SET period_id = pm.new_id::text
FROM period_id_mapping pm
WHERE t.period_id = pm.old_id;

-- 3.2 更新task_records表中的period_id
UPDATE roleplay_task_records tr
SET period_id = pm.new_id::text
FROM period_id_mapping pm
WHERE tr.period_id = pm.old_id;

-- 3.3 更新task_records表中的original_period（补任务时的原时段）
UPDATE roleplay_task_records tr
SET original_period = pm.new_id::text
FROM period_id_mapping pm
WHERE tr.original_period = pm.old_id;

-- 3.4 更新tasks表中的prerequisite_periods数组
UPDATE roleplay_tasks t
SET prerequisite_periods = array(
    SELECT pm.new_id::text 
    FROM unnest(t.prerequisite_periods) AS pp
    JOIN period_id_mapping pm ON pm.old_id = pp
)
WHERE prerequisite_periods IS NOT NULL AND array_length(prerequisite_periods, 1) > 0;

-- 4. 最后更新workflow_periods表本身的id
UPDATE roleplay_workflow_periods p
SET id = pm.new_id::text
FROM period_id_mapping pm
WHERE p.id = pm.old_id;

-- 5. 查看转换结果
SELECT 
    pm.old_id as "原ID",
    SUBSTRING(pm.new_id::text, 1, 8) || '...' as "新ID(前8位)",
    p.name as "时段名称",
    p.display_name as "显示名称",
    r.name as "餐厅"
FROM period_id_mapping pm
JOIN roleplay_workflow_periods p ON p.id = pm.new_id::text
LEFT JOIN roleplay_restaurants r ON r.id = p.restaurant_id
ORDER BY p.display_order;