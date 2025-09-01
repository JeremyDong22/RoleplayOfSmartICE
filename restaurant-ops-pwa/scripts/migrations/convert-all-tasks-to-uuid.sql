-- 将所有任务ID从有意义的字符串改为UUID
-- 这样可以避免ID名称造成的混淆

-- 1. 创建临时映射表
CREATE TEMP TABLE task_id_mapping (
    old_id VARCHAR(255),
    new_id UUID DEFAULT gen_random_uuid()
);

-- 2. 插入所有现有任务ID的映射
INSERT INTO task_id_mapping (old_id)
SELECT DISTINCT id FROM roleplay_tasks;

-- 3. 先更新所有依赖表中的task_id
UPDATE roleplay_task_records tr
SET task_id = tm.new_id::text
FROM task_id_mapping tm
WHERE tr.task_id = tm.old_id;

-- 4. 更新其他可能引用task_id的地方
-- 例如：linked_tasks 数组
UPDATE roleplay_tasks t
SET linked_tasks = array(
    SELECT tm.new_id::text 
    FROM unnest(t.linked_tasks) AS lt
    JOIN task_id_mapping tm ON tm.old_id = lt
)
WHERE linked_tasks IS NOT NULL AND array_length(linked_tasks, 1) > 0;

-- 5. 最后更新tasks表本身的id
UPDATE roleplay_tasks t
SET id = tm.new_id::text
FROM task_id_mapping tm
WHERE t.id = tm.old_id;

-- 6. 查看转换结果（可选）
SELECT 
    tm.old_id,
    tm.new_id,
    t.title,
    t.period_id,
    t.role_code
FROM task_id_mapping tm
JOIN roleplay_tasks t ON t.id = tm.new_id::text
ORDER BY t.period_id, t.role_code, t.sort_order;