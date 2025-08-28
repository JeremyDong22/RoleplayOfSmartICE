-- Migration: Create roleplay_inventory_records_view
-- Created: 2025-08-26
-- Purpose: Extract and consolidate all inventory-related records from task_records

-- Drop existing view if exists
DROP VIEW IF EXISTS roleplay_inventory_records_view CASCADE;

-- Create comprehensive inventory records view
CREATE OR REPLACE VIEW roleplay_inventory_records_view AS
WITH 
-- 收货记录解析
receipt_records AS (
  SELECT 
    t.id as record_id,
    t.restaurant_id,
    t.user_id,
    u.username as operator_name,
    t.date as record_date,
    t.created_at as operation_time,
    'receipt' as operation_type,
    '入库' as operation_type_display,
    
    -- 解析structured_data中的字段
    (t.submission_metadata->'structured_data'->>'item_name')::text as item_name,
    (t.submission_metadata->'structured_data'->>'quantity')::numeric as quantity,
    (t.submission_metadata->'structured_data'->>'unit')::text as unit,
    (t.submission_metadata->'structured_data'->>'unit_price')::numeric as unit_price,
    (t.submission_metadata->'structured_data'->>'total_price')::numeric as total_price,
    (t.submission_metadata->'structured_data'->>'supplier')::text as supplier,
    (t.submission_metadata->'structured_data'->>'invoice_no')::text as invoice_no,
    
    NULL::numeric as loss_quantity,
    NULL::numeric as loss_cost,
    
    t.text_content as notes,
    t.submission_metadata as raw_metadata,
    t.task_id,
    tasks.title as task_name
  FROM roleplay_task_records t
  LEFT JOIN roleplay_users u ON t.user_id = u.id
  LEFT JOIN roleplay_tasks tasks ON t.task_id = tasks.id::varchar
  WHERE 
    -- 收货验货任务
    (t.task_id IN ('94212a8d-016b-4ec2-b942-8006e879c9b6', 'fdb214f6-7d67-4be6-b648-f9ac17f2b43d')
     AND t.submission_metadata->'structured_data'->>'item_name' IS NOT NULL)
    OR 
    -- 或者明确标记为receipt类型
    (t.submission_metadata->>'type' = 'receipt')
),

-- 盘点损耗记录解析 - 单个物品格式
single_loss_records AS (
  SELECT 
    t.id as record_id,
    t.restaurant_id,
    t.user_id,
    u.username as operator_name,
    t.date as record_date,
    t.created_at as operation_time,
    'loss' as operation_type,
    '损耗' as operation_type_display,
    
    (t.submission_metadata->>'item_name')::text as item_name,
    NULL::numeric as quantity,
    NULL::text as unit,
    NULL::numeric as unit_price,
    NULL::numeric as total_price,
    NULL::text as supplier,
    NULL::text as invoice_no,
    
    (t.submission_metadata->>'loss_quantity')::numeric as loss_quantity,
    COALESCE((t.submission_metadata->>'loss_cost')::numeric, 0) as loss_cost,
    
    COALESCE(t.text_content, t.submission_metadata->>'notes') as notes,
    t.submission_metadata as raw_metadata,
    t.task_id,
    tasks.title as task_name
  FROM roleplay_task_records t
  LEFT JOIN roleplay_users u ON t.user_id = u.id
  LEFT JOIN roleplay_tasks tasks ON t.task_id = tasks.id::varchar
  WHERE 
    t.submission_metadata->>'type' = 'inventory_loss'
    AND t.submission_metadata->>'item_name' IS NOT NULL
    AND t.submission_metadata->'loss_items' IS NULL
),

-- 盘点损耗记录解析 - 批量物品格式（展开loss_items数组）
batch_loss_records AS (
  SELECT 
    t.id || '-' || (row_number() OVER (PARTITION BY t.id ORDER BY ordinality))::text as record_id,
    t.restaurant_id,
    t.user_id,
    u.username as operator_name,
    t.date as record_date,
    t.created_at as operation_time,
    'loss' as operation_type,
    CASE 
      WHEN (item.value->>'loss_quantity')::numeric > 0 THEN '损耗'
      WHEN (item.value->>'loss_quantity')::numeric < 0 THEN '盈余'
      ELSE '平衡'
    END as operation_type_display,
    
    (item.value->>'item_name')::text as item_name,
    NULL::numeric as quantity,
    NULL::text as unit,
    NULL::numeric as unit_price,
    NULL::numeric as total_price,
    NULL::text as supplier,
    NULL::text as invoice_no,
    
    (item.value->>'loss_quantity')::numeric as loss_quantity,
    COALESCE((item.value->>'loss_cost')::numeric, 0) as loss_cost,
    
    COALESCE(item.value->>'cost_detail', t.submission_metadata->>'notes') as notes,
    t.submission_metadata as raw_metadata,
    t.task_id,
    tasks.title as task_name
  FROM roleplay_task_records t
  LEFT JOIN roleplay_users u ON t.user_id = u.id
  LEFT JOIN roleplay_tasks tasks ON t.task_id = tasks.id::varchar
  CROSS JOIN LATERAL jsonb_array_elements(t.submission_metadata->'loss_items') WITH ORDINALITY AS item(value, ordinality)
  WHERE 
    t.submission_metadata->>'type' = 'inventory_loss'
    AND t.submission_metadata->'loss_items' IS NOT NULL
),

-- 正常消耗记录
consumption_records AS (
  SELECT 
    t.id as record_id,
    t.restaurant_id,
    t.user_id,
    u.username as operator_name,
    t.date as record_date,
    t.created_at as operation_time,
    'consumption' as operation_type,
    '消耗' as operation_type_display,
    
    (t.submission_metadata->>'item_name')::text as item_name,
    NULL::numeric as quantity,
    NULL::text as unit,
    NULL::numeric as unit_price,
    NULL::numeric as total_price,
    NULL::text as supplier,
    NULL::text as invoice_no,
    
    (t.submission_metadata->>'consumption_quantity')::numeric as loss_quantity,
    COALESCE((t.submission_metadata->>'consumption_cost')::numeric, 0) as loss_cost,
    
    t.text_content as notes,
    t.submission_metadata as raw_metadata,
    t.task_id,
    tasks.title as task_name
  FROM roleplay_task_records t
  LEFT JOIN roleplay_users u ON t.user_id = u.id
  LEFT JOIN roleplay_tasks tasks ON t.task_id = tasks.id::varchar
  WHERE 
    t.submission_metadata->>'type' = 'consumption'
)

-- 合并所有记录
SELECT * FROM receipt_records
UNION ALL
SELECT * FROM single_loss_records
UNION ALL
SELECT * FROM batch_loss_records
UNION ALL
SELECT * FROM consumption_records
ORDER BY operation_time DESC;

-- Grant permissions
GRANT SELECT ON roleplay_inventory_records_view TO authenticated;
GRANT SELECT ON roleplay_inventory_records_view TO anon;

-- Add comment
COMMENT ON VIEW roleplay_inventory_records_view IS 
'Comprehensive view of all inventory-related records extracted from task_records table. 
Includes receipts, inventory losses, surpluses, and consumption records with full metadata.';