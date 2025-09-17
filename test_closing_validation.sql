-- Test script to debug store closing validation issues
-- Version: 1.0.0
-- Date: 2025-01-18
-- Purpose: Check actual task data and completed records for store closing validation

-- Restaurant ID and date we're checking
-- restaurant_id = '5fa19636-2725-4c09-b00f-7e1bc892bb69'
-- date = '2024-09-17'

-- Step 1: Check closing period tasks and their actual role_code
SELECT
  t.id,
  t.title,
  t.role_code,
  wp.name as period_name,
  wp.display_name
FROM roleplay_tasks t
JOIN roleplay_workflow_periods wp ON t.period_id = wp.id
WHERE t.restaurant_id = '5fa19636-2725-4c09-b00f-7e1bc892bb69'
  AND wp.restaurant_id = '5fa19636-2725-4c09-b00f-7e1bc892bb69'
  AND wp.name = '收市与打烊'
  AND t.role_code IN ('manager', 'duty_manager')
  AND t.is_notice = false
  AND (t.is_floating = false OR t.is_floating IS NULL)
ORDER BY t.title;

-- Step 2: Check completed task records for 2024-09-17
SELECT
  tr.id as record_id,
  tr.task_id,
  t.title,
  t.role_code,
  tr.date,
  tr.created_at,
  tr.status,
  tr.review_status,
  wp.name as period_name
FROM roleplay_task_records tr
JOIN roleplay_tasks t ON tr.task_id = t.id
JOIN roleplay_workflow_periods wp ON t.period_id = wp.id
WHERE tr.restaurant_id = '5fa19636-2725-4c09-b00f-7e1bc892bb69'
  AND tr.date = '2024-09-17'
  AND wp.name = '收市与打烊'
  AND t.role_code IN ('manager', 'duty_manager')
ORDER BY tr.created_at;

-- Step 3: Check specific tasks mentioned in the issue
SELECT
  t.id,
  t.title,
  t.role_code,
  wp.name as period_name,
  wp.display_name,
  tr.id as record_id,
  tr.date,
  tr.created_at,
  tr.status,
  tr.review_status
FROM roleplay_tasks t
JOIN roleplay_workflow_periods wp ON t.period_id = wp.id
LEFT JOIN roleplay_task_records tr ON
  tr.task_id = t.id
  AND tr.restaurant_id = '5fa19636-2725-4c09-b00f-7e1bc892bb69'
  AND tr.date = '2024-09-17'
WHERE t.restaurant_id = '5fa19636-2725-4c09-b00f-7e1bc892bb69'
  AND t.title IN ('能源安全检查', '收市清洁检查', '营业数据记录')
ORDER BY t.title;

-- Step 4: Run the actual validation function to see what it returns
SELECT check_store_closing_validation(
  '5fa19636-2725-4c09-b00f-7e1bc892bb69'::uuid,
  '2024-09-17'::date
);

-- Step 5: Check all task records for that date to understand the full picture
SELECT
  tr.id as record_id,
  tr.task_id,
  t.title,
  t.role_code,
  tr.date,
  TO_CHAR(tr.created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI:SS') as created_at_local,
  tr.status,
  tr.review_status,
  wp.name as period_name,
  wp.display_name
FROM roleplay_task_records tr
JOIN roleplay_tasks t ON tr.task_id = t.id
JOIN roleplay_workflow_periods wp ON t.period_id = wp.id
WHERE tr.restaurant_id = '5fa19636-2725-4c09-b00f-7e1bc892bb69'
  AND tr.date = '2024-09-17'
  AND tr.created_at >= '2024-09-17 14:00:00+00:00'  -- After 10 PM China time
ORDER BY tr.created_at;