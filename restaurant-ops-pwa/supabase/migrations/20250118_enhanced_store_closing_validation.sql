-- Enhanced store closing validation with period-based rules
-- Created: 2025-01-18
-- Purpose: Separate critical (closing period) tasks from other period tasks

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.check_store_closing_validation(uuid, date);

-- Create enhanced store closing validation function
CREATE OR REPLACE FUNCTION public.check_store_closing_validation(
    p_restaurant_id uuid,
    p_check_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_closing_tasks jsonb;
    v_other_tasks jsonb;
    v_closing_missing jsonb;
    v_other_missing jsonb;
    v_closing_completed int;
    v_closing_total int;
    v_other_completed int;
    v_other_total int;
    v_can_close boolean;
    v_validation_level text;
    v_message text;
    v_result jsonb;
BEGIN
    -- Step 1: Get closing period tasks and their completion status
    WITH closing_period_tasks AS (
        SELECT
            t.id,
            t.title,
            t.role_code,
            p.name as period_name,
            p.time_slot,
            CASE
                WHEN tr.id IS NOT NULL THEN true
                ELSE false
            END as is_completed
        FROM roleplay_tasks t
        INNER JOIN roleplay_workflow_periods p ON t.period_id = p.id
        LEFT JOIN roleplay_task_records tr ON
            t.id = tr.task_id
            AND tr.restaurant_id = p_restaurant_id
            AND tr.date = p_check_date
        WHERE t.restaurant_id = p_restaurant_id
            AND t.role_code IN ('manager', 'duty_manager')
            AND p.time_slot = 'closing'
            AND t.is_notice = false
            AND COALESCE(t.is_floating, false) = false
    )
    SELECT
        jsonb_build_object(
            'total_tasks', COUNT(*),
            'completed_count', COUNT(*) FILTER (WHERE is_completed = true),
            'is_completed', BOOL_AND(is_completed),
            'missing_tasks', jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'title', title,
                    'role_code', role_code,
                    'period_name', period_name
                )
            ) FILTER (WHERE is_completed = false)
        )
    INTO v_closing_tasks
    FROM closing_period_tasks;

    -- Step 2: Get other period tasks and their completion status
    WITH other_period_tasks AS (
        SELECT
            t.id,
            t.title,
            t.role_code,
            p.name as period_name,
            p.time_slot,
            CASE
                WHEN tr.id IS NOT NULL THEN true
                ELSE false
            END as is_completed
        FROM roleplay_tasks t
        INNER JOIN roleplay_workflow_periods p ON t.period_id = p.id
        LEFT JOIN roleplay_task_records tr ON
            t.id = tr.task_id
            AND tr.restaurant_id = p_restaurant_id
            AND tr.date = p_check_date
        WHERE t.restaurant_id = p_restaurant_id
            AND t.role_code IN ('manager', 'duty_manager')
            AND p.time_slot != 'closing'
            AND t.is_notice = false
            AND COALESCE(t.is_floating, false) = false
    )
    SELECT
        jsonb_build_object(
            'total_tasks', COUNT(*),
            'completed_count', COUNT(*) FILTER (WHERE is_completed = true),
            'is_completed', BOOL_AND(COALESCE(is_completed, true)),  -- Default to true if no tasks
            'missing_tasks', jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'title', title,
                    'role_code', role_code,
                    'period_name', period_name,
                    'time_slot', time_slot
                )
            ) FILTER (WHERE is_completed = false),
            'missing_by_period', (
                SELECT jsonb_object_agg(
                    period_name,
                    tasks
                )
                FROM (
                    SELECT
                        period_name,
                        jsonb_agg(
                            jsonb_build_object(
                                'id', id,
                                'title', title,
                                'role_code', role_code
                            )
                        ) as tasks
                    FROM other_period_tasks
                    WHERE is_completed = false
                    GROUP BY period_name
                ) grouped
            )
        )
    INTO v_other_tasks
    FROM other_period_tasks;

    -- Step 3: Determine validation level and message
    v_closing_total := COALESCE((v_closing_tasks->>'total_tasks')::int, 0);
    v_closing_completed := COALESCE((v_closing_tasks->>'completed_count')::int, 0);
    v_other_total := COALESCE((v_other_tasks->>'total_tasks')::int, 0);
    v_other_completed := COALESCE((v_other_tasks->>'completed_count')::int, 0);

    -- Check if closing tasks are completed
    IF v_closing_total > 0 AND v_closing_completed < v_closing_total THEN
        -- Critical tasks not completed - cannot close
        v_can_close := false;
        v_validation_level := 'ERROR';
        v_message := format(
            '无法闭店：还有%s个闭店任务未完成，必须先完成这些任务',
            v_closing_total - v_closing_completed
        );
    ELSIF v_other_total > 0 AND v_other_completed < v_other_total THEN
        -- Other tasks not completed - can close with warning
        v_can_close := true;
        v_validation_level := 'WARNING';
        v_message := format(
            '可以闭店，但还有%s个其他时段任务未完成',
            v_other_total - v_other_completed
        );
    ELSE
        -- All tasks completed
        v_can_close := true;
        v_validation_level := 'SUCCESS';
        v_message := '所有任务已完成，可以安全闭店';
    END IF;

    -- Step 4: Build actions required
    v_result := jsonb_build_object(
        'can_close', v_can_close,
        'validation_level', v_validation_level,
        'message', v_message,
        'check_date', p_check_date,
        'restaurant_id', p_restaurant_id,
        'closing_period', v_closing_tasks,
        'other_periods', v_other_tasks,
        'summary', jsonb_build_object(
            'total_required', v_closing_total + v_other_total,
            'total_completed', v_closing_completed + v_other_completed,
            'closing_required', v_closing_total,
            'closing_completed', v_closing_completed,
            'other_required', v_other_total,
            'other_completed', v_other_completed
        )
    );

    -- Add actions required based on validation level
    IF v_validation_level = 'ERROR' THEN
        v_result := v_result || jsonb_build_object(
            'actions_required', jsonb_build_array(
                jsonb_build_object(
                    'type', 'COMPLETE_TASK',
                    'priority', 'CRITICAL',
                    'description', '必须完成以下闭店任务才能闭店',
                    'tasks', v_closing_tasks->'missing_tasks'
                )
            )
        );
    ELSIF v_validation_level = 'WARNING' THEN
        v_result := v_result || jsonb_build_object(
            'actions_required', jsonb_build_array(
                jsonb_build_object(
                    'type', 'CONFIRM_SKIP',
                    'priority', 'OPTIONAL',
                    'description', '以下其他时段任务未完成，可以选择跳过',
                    'tasks', v_other_tasks->'missing_tasks'
                )
            )
        );
    ELSE
        v_result := v_result || jsonb_build_object(
            'actions_required', jsonb_build_array()
        );
    END IF;

    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_store_closing_validation(uuid, date) TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_roleplay_tasks_closing_validation
ON roleplay_tasks(restaurant_id, role_code)
WHERE is_notice = false AND COALESCE(is_floating, false) = false;

-- Add comment
COMMENT ON FUNCTION public.check_store_closing_validation IS
'Enhanced store closing validation that separates critical closing period tasks from other period tasks.
Returns detailed validation with three levels: SUCCESS (all complete), WARNING (can close with warnings), ERROR (cannot close).';