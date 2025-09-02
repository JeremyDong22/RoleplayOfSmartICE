-- Migration: Remove duplicate workflow periods that were created on 2025-08-03
-- These duplicates have no tasks associated and are causing the "餐后收市" section to appear empty
-- Issue: User only sees "收货验货" task in post-meal closing section because the wrong period is being displayed

-- First, verify which periods will be deleted (safety check)
SELECT 
    id,
    name,
    display_name,
    created_at,
    'Will be deleted' as status
FROM roleplay_workflow_periods
WHERE created_at::date = '2025-08-03'
AND restaurant_id = 'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a';

-- Delete the duplicate workflow periods created on 2025-08-03
-- These are confirmed to have:
-- 1. No tasks associated (checked via LEFT JOIN with roleplay_tasks)
-- 2. No task records associated (checked via LEFT JOIN with roleplay_task_records)
DELETE FROM roleplay_workflow_periods
WHERE created_at::date = '2025-08-03'
AND restaurant_id = 'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a'
AND id IN (
    '975e2408-7889-4b24-90eb-ff92db47034c',  -- Duplicate "开店"
    '1cbd4f63-af64-47c1-8d12-7b97261a739c',  -- Duplicate "午餐服务"
    '6610c64a-5c18-4754-868d-e115ff652150'   -- Duplicate "餐后收市 - 午市" (the problematic one)
);

-- Verify the remaining periods and their task counts
SELECT 
    p.id,
    p.name,
    p.display_name,
    p.display_order,
    COUNT(t.id) as task_count
FROM roleplay_workflow_periods p
LEFT JOIN roleplay_tasks t ON t.period_id = p.id AND t.is_active = true
WHERE p.restaurant_id = 'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a'
GROUP BY p.id, p.name, p.display_name, p.display_order
ORDER BY p.display_order;