-- Fix store closing validation function
-- Version: 3.0.0
-- Date: 2025-01-18
-- Purpose: Fix role_code matching and ensure proper period detection for closing tasks

-- Drop the existing function
DROP FUNCTION IF EXISTS public.check_store_closing_validation(uuid, date);

-- Create the fixed validation function
CREATE OR REPLACE FUNCTION public.check_store_closing_validation(
  p_restaurant_id uuid,
  p_current_date date
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_closing_period_id uuid;
  v_closing_tasks json;
  v_other_tasks json;
  v_can_close boolean := true;
  v_validation_level text := 'SUCCESS';
  v_message text := '';
  v_actions_required json := '[]'::json;
  v_missing_by_period json;
  v_debug_info json;
BEGIN
  -- Get closing period ID by name (收市与打烊) - ensure exact match
  SELECT id INTO v_closing_period_id
  FROM roleplay_workflow_periods
  WHERE restaurant_id = p_restaurant_id
    AND name = '收市与打烊';  -- Exact period name

  -- Debug: Log the closing period ID found
  v_debug_info := json_build_object(
    'closing_period_id', v_closing_period_id,
    'restaurant_id', p_restaurant_id,
    'check_date', p_current_date
  );

  -- Get tasks for closing period (manager and duty_manager only)
  WITH closing_period_tasks AS (
    SELECT
      t.id,
      t.title,
      t.role_code,
      wp.display_name as period_name,
      wp.name as period_key,
      -- Check for completed records with proper matching
      EXISTS (
        SELECT 1
        FROM roleplay_task_records tr
        WHERE tr.task_id = t.id
          AND tr.restaurant_id = p_restaurant_id
          AND tr.date = p_current_date
          AND (tr.status = 'completed' OR tr.status IS NULL)  -- Handle both completed and null status
          AND (tr.review_status = 'Approved' OR tr.review_status = 'approved' OR tr.review_status IS NULL)  -- Handle approval variations
      ) as is_completed,
      -- Get completion details for debugging
      (
        SELECT json_build_object(
          'record_id', tr.id,
          'status', tr.status,
          'review_status', tr.review_status,
          'created_at', tr.created_at
        )
        FROM roleplay_task_records tr
        WHERE tr.task_id = t.id
          AND tr.restaurant_id = p_restaurant_id
          AND tr.date = p_current_date
        ORDER BY tr.created_at DESC
        LIMIT 1
      ) as completion_details
    FROM roleplay_tasks t
    INNER JOIN roleplay_workflow_periods wp ON t.period_id = wp.id
    WHERE t.restaurant_id = p_restaurant_id
      AND wp.restaurant_id = p_restaurant_id
      AND wp.name = '收市与打烊'  -- Use exact period name
      AND t.role_code IN ('manager', 'duty_manager')  -- Only these roles
      AND t.is_notice = false  -- Exclude notice tasks
      AND (t.is_floating = false OR t.is_floating IS NULL)  -- Exclude floating tasks
  )
  SELECT json_build_object(
    'isCompleted', bool_and(COALESCE(is_completed, false)),
    'totalTasks', count(*)::int,
    'completedCount', count(*) FILTER (WHERE is_completed = true)::int,
    'missingTasks', COALESCE(
      json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'roleCode', role_code,
          'periodName', period_name,
          'completionDetails', completion_details
        )
      ) FILTER (WHERE is_completed = false),
      '[]'::json
    ),
    'allTasks', json_agg(
      json_build_object(
        'id', id,
        'title', title,
        'roleCode', role_code,
        'isCompleted', is_completed,
        'completionDetails', completion_details
      )
    )
  ) INTO v_closing_tasks
  FROM closing_period_tasks;

  -- Get tasks for other periods (manager and duty_manager only)
  WITH other_period_tasks AS (
    SELECT
      t.id,
      t.title,
      t.role_code,
      wp.display_name as period_name,
      wp.name as period_key,
      -- Check for completed records with proper matching
      EXISTS (
        SELECT 1
        FROM roleplay_task_records tr
        WHERE tr.task_id = t.id
          AND tr.restaurant_id = p_restaurant_id
          AND tr.date = p_current_date
          AND (tr.status = 'completed' OR tr.status IS NULL)
          AND (tr.review_status = 'Approved' OR tr.review_status = 'approved' OR tr.review_status IS NULL)
      ) as is_completed
    FROM roleplay_tasks t
    INNER JOIN roleplay_workflow_periods wp ON t.period_id = wp.id
    WHERE t.restaurant_id = p_restaurant_id
      AND wp.restaurant_id = p_restaurant_id
      AND wp.name != '收市与打烊'  -- All periods except closing
      AND t.role_code IN ('manager', 'duty_manager')  -- Only these roles
      AND t.is_notice = false
      AND (t.is_floating = false OR t.is_floating IS NULL)
  ),
  missing_grouped AS (
    SELECT
      period_name,
      json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'roleCode', role_code
        )
      ) as tasks
    FROM other_period_tasks
    WHERE is_completed = false
    GROUP BY period_name
  )
  SELECT
    json_build_object(
      'missingByPeriod', COALESCE(json_object_agg(period_name, tasks), '{}'::json)
    ) INTO v_missing_by_period
  FROM missing_grouped;

  -- Build the other_tasks summary
  WITH other_summary AS (
    SELECT
      bool_and(COALESCE(is_completed, true)) as all_completed,
      count(*)::int as total,
      count(*) FILTER (WHERE is_completed = true)::int as completed,
      json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'roleCode', role_code,
          'periodName', period_name
        )
      ) FILTER (WHERE is_completed = false) as missing
    FROM (
      SELECT
        t.id,
        t.title,
        t.role_code,
        wp.display_name as period_name,
        EXISTS (
          SELECT 1
          FROM roleplay_task_records tr
          WHERE tr.task_id = t.id
            AND tr.restaurant_id = p_restaurant_id
            AND tr.date = p_current_date
            AND (tr.status = 'completed' OR tr.status IS NULL)
            AND (tr.review_status = 'Approved' OR tr.review_status = 'approved' OR tr.review_status IS NULL)
        ) as is_completed
      FROM roleplay_tasks t
      INNER JOIN roleplay_workflow_periods wp ON t.period_id = wp.id
      WHERE t.restaurant_id = p_restaurant_id
        AND wp.restaurant_id = p_restaurant_id
        AND wp.name != '收市与打烊'
        AND t.role_code IN ('manager', 'duty_manager')
        AND t.is_notice = false
        AND (t.is_floating = false OR t.is_floating IS NULL)
    ) other_tasks
  )
  SELECT json_build_object(
    'isCompleted', all_completed,
    'totalTasks', total,
    'completedCount', completed,
    'missingTasks', COALESCE(missing, '[]'::json),
    'missingByPeriod', COALESCE(v_missing_by_period->'missingByPeriod', '{}'::json)
  ) INTO v_other_tasks
  FROM other_summary;

  -- Determine validation level and message
  IF v_closing_tasks IS NULL THEN
    -- No closing tasks found (shouldn't happen but handle gracefully)
    v_closing_tasks := json_build_object(
      'isCompleted', true,
      'totalTasks', 0,
      'completedCount', 0,
      'missingTasks', '[]'::json
    );
  END IF;

  IF v_other_tasks IS NULL THEN
    -- No other tasks found
    v_other_tasks := json_build_object(
      'isCompleted', true,
      'totalTasks', 0,
      'completedCount', 0,
      'missingTasks', '[]'::json,
      'missingByPeriod', '{}'::json
    );
  END IF;

  -- Check closing tasks completion
  IF (v_closing_tasks->>'totalTasks')::int > 0 AND (v_closing_tasks->>'isCompleted')::boolean = false THEN
    v_can_close := false;
    v_validation_level := 'ERROR';
    v_message := '无法闭店：还有' ||
      ((v_closing_tasks->>'totalTasks')::int - (v_closing_tasks->>'completedCount')::int) ||
      '个闭店任务未完成，必须先完成这些任务';
    v_actions_required := json_build_array(
      json_build_object(
        'type', 'COMPLETE_TASK',
        'priority', 'CRITICAL',
        'description', '请完成所有闭店时段的任务',
        'tasks', v_closing_tasks->'missingTasks'
      )
    );
  ELSIF (v_other_tasks->>'totalTasks')::int > 0 AND (v_other_tasks->>'isCompleted')::boolean = false THEN
    v_can_close := true;
    v_validation_level := 'WARNING';
    v_message := '提醒：还有' ||
      ((v_other_tasks->>'totalTasks')::int - (v_other_tasks->>'completedCount')::int) ||
      '个其他时段任务未完成，建议完成后再闭店';
    v_actions_required := json_build_array(
      json_build_object(
        'type', 'CONFIRM_SKIP',
        'priority', 'OPTIONAL',
        'description', '建议完成所有任务后再闭店，或确认跳过',
        'tasks', v_other_tasks->'missingTasks'
      )
    );
  ELSE
    v_can_close := true;
    v_validation_level := 'SUCCESS';
    v_message := '所有任务已完成，可以安全闭店';
  END IF;

  -- Return the final result with debug information
  RETURN json_build_object(
    'canClose', v_can_close,
    'validationLevel', v_validation_level,
    'message', v_message,
    'closingPeriod', v_closing_tasks,
    'otherPeriods', v_other_tasks,
    'actionsRequired', v_actions_required,
    'debug', v_debug_info
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_store_closing_validation(uuid, date) TO authenticated;

-- Add improved comment
COMMENT ON FUNCTION public.check_store_closing_validation(uuid, date) IS
'Fixed validation function for store closing. Properly matches completed tasks using EXISTS clause
and handles both status and review_status variations. Only validates manager and duty_manager tasks,
excluding chef tasks. Uses exact period name "收市与打烊" for closing period detection.';

-- Create an analysis query to verify the fix
SELECT
  '=== Testing Fixed Store Closing Validation ===' as test_header,
  check_store_closing_validation(
    '5fa19636-2725-4c09-b00f-7e1bc892bb69'::uuid,
    '2024-09-17'::date
  ) as validation_result;