-- Fix store closing validation to correctly identify closing period
-- Version: 2.0.0
-- Date: 2025-01-18
-- Purpose: Fix period detection - use p.name instead of non-existent p.time_slot column

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
BEGIN
  -- Get closing period ID by name (收市与打烊)
  SELECT id INTO v_closing_period_id
  FROM roleplay_workflow_periods
  WHERE restaurant_id = p_restaurant_id
    AND name = '收市与打烊';

  -- Get tasks for closing period (only manager and duty_manager, NO chef)
  WITH closing_period_tasks AS (
    SELECT
      t.id,
      t.title,
      t.role_code,
      wp.display_name as period_name,
      CASE
        WHEN tr.id IS NOT NULL THEN true
        ELSE false
      END as is_completed
    FROM roleplay_tasks t
    JOIN roleplay_workflow_periods wp ON t.period_id = wp.id
    LEFT JOIN roleplay_task_records tr ON
      tr.task_id = t.id
      AND tr.restaurant_id = p_restaurant_id
      AND tr.date = p_current_date
      AND tr.status = 'completed'
    WHERE t.restaurant_id = p_restaurant_id
      AND wp.restaurant_id = p_restaurant_id  -- Ensure period is for same restaurant
      AND wp.name = '收市与打烊'  -- Use period name instead of time_slot
      AND t.role_code IN ('manager', 'duty_manager')  -- Exclude chef
      AND t.is_notice = false
      AND (t.is_floating = false OR t.is_floating IS NULL)
  )
  SELECT json_build_object(
    'isCompleted', bool_and(is_completed),
    'totalTasks', count(*)::int,
    'completedCount', count(*) FILTER (WHERE is_completed)::int,
    'missingTasks', COALESCE(
      json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'roleCode', role_code,
          'periodName', period_name
        )
      ) FILTER (WHERE NOT is_completed),
      '[]'::json
    )
  ) INTO v_closing_tasks
  FROM closing_period_tasks;

  -- Get tasks for other periods (only manager and duty_manager, NO chef)
  WITH other_period_tasks AS (
    SELECT
      t.id,
      t.title,
      t.role_code,
      wp.display_name as period_name,
      wp.name as period_key,
      CASE
        WHEN tr.id IS NOT NULL THEN true
        ELSE false
      END as is_completed
    FROM roleplay_tasks t
    JOIN roleplay_workflow_periods wp ON t.period_id = wp.id
    LEFT JOIN roleplay_task_records tr ON
      tr.task_id = t.id
      AND tr.restaurant_id = p_restaurant_id
      AND tr.date = p_current_date
      AND tr.status = 'completed'
    WHERE t.restaurant_id = p_restaurant_id
      AND wp.restaurant_id = p_restaurant_id  -- Ensure period is for same restaurant
      AND wp.name != '收市与打烊'  -- All periods except closing
      AND t.role_code IN ('manager', 'duty_manager')  -- Exclude chef
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
    WHERE NOT is_completed
    GROUP BY period_name
  )
  SELECT
    json_build_object(
      'missingByPeriod', COALESCE(json_object_agg(period_name, tasks), '{}'::json)
    ) INTO v_missing_by_period
  FROM missing_grouped;

  SELECT json_build_object(
    'isCompleted', bool_and(is_completed),
    'totalTasks', count(*)::int,
    'completedCount', count(*) FILTER (WHERE is_completed)::int,
    'missingTasks', COALESCE(
      json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'roleCode', role_code,
          'periodName', period_name
        )
      ) FILTER (WHERE NOT is_completed),
      '[]'::json
    ),
    'missingByPeriod', COALESCE(v_missing_by_period->'missingByPeriod', '{}'::json)
  ) INTO v_other_tasks
  FROM other_period_tasks;

  -- Determine validation level and message
  IF (v_closing_tasks->'isCompleted')::boolean = false THEN
    v_can_close := false;
    v_validation_level := 'ERROR';
    v_message := '无法闭店：还有' || (v_closing_tasks->'totalTasks')::int - (v_closing_tasks->'completedCount')::int || '个闭店任务未完成，必须先完成这些任务';
    v_actions_required := json_build_array(
      json_build_object(
        'type', 'COMPLETE_TASK',
        'priority', 'CRITICAL',
        'description', '请完成所有闭店时段的任务',
        'tasks', v_closing_tasks->'missingTasks'
      )
    );
  ELSIF (v_other_tasks->'isCompleted')::boolean = false THEN
    v_can_close := true;
    v_validation_level := 'WARNING';
    v_message := '提醒：还有' || (v_other_tasks->'totalTasks')::int - (v_other_tasks->'completedCount')::int || '个其他时段任务未完成，建议完成后再闭店';
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

  RETURN json_build_object(
    'canClose', v_can_close,
    'validationLevel', v_validation_level,
    'message', v_message,
    'closingPeriod', v_closing_tasks,
    'otherPeriods', v_other_tasks,
    'actionsRequired', v_actions_required
  );
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.check_store_closing_validation(uuid, date) IS
'Validates store closing by checking task completion. Uses period name "收市与打烊" to identify closing period. Only validates manager and duty_manager tasks, excluding chef tasks.';