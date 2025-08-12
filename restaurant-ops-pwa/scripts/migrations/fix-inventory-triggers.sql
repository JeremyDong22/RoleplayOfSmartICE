-- Fix inventory triggers for price tracking
-- Created: 2025-01-13
-- Purpose: Create working triggers that bypass PostgreSQL limitations

-- Note: Since we cannot create triggers with subqueries in WHEN conditions,
-- and we don't have superuser access to create triggers directly,
-- we'll need to manually call the update function from the application layer.

-- The update_inventory_on_task_submission() function is already created and working.
-- It handles both purchase (收货验货) and wastage (损耗盘点) tasks.

-- To use this system:
-- 1. After inserting a task_record with structured_data, call this function manually:
--    SELECT update_inventory_for_task_record(task_record_id);

-- Create a wrapper function that can be called manually
CREATE OR REPLACE FUNCTION update_inventory_for_task_record(p_task_record_id UUID)
RETURNS VOID AS $$
DECLARE
  v_record RECORD;
  v_task_title VARCHAR;
  v_quantity NUMERIC;
  v_unit_price NUMERIC;
  v_total_price NUMERIC;
  v_inventory_id UUID;
  v_item_name VARCHAR;
  v_remaining_to_deduct NUMERIC;
  v_batch RECORD;
  v_deduct_qty NUMERIC;
  v_total_cost NUMERIC := 0;
BEGIN
  -- Get the task record
  SELECT * INTO v_record
  FROM roleplay_task_records
  WHERE id = p_task_record_id
    AND status = 'submitted';
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Task record not found or not submitted: %', p_task_record_id;
    RETURN;
  END IF;
  
  -- Get task title
  SELECT title INTO v_task_title
  FROM roleplay_tasks
  WHERE id = v_record.task_id;
  
  -- Check if it has structured data
  IF NOT (v_record.submission_metadata ? 'structured_data' 
     AND v_record.submission_metadata->'structured_data' ? 'item_name') THEN
    RETURN;
  END IF;
  
  -- Extract common data
  v_item_name := v_record.submission_metadata->'structured_data'->>'item_name';
  v_quantity := COALESCE((v_record.submission_metadata->'structured_data'->>'quantity')::NUMERIC, 0);
  
  IF v_quantity <= 0 THEN
    RETURN;
  END IF;
  
  -- Get inventory item ID
  SELECT id INTO v_inventory_id 
  FROM roleplay_inventory 
  WHERE item_name = v_item_name 
    AND restaurant_id = v_record.restaurant_id
  LIMIT 1;
  
  IF v_inventory_id IS NULL THEN
    RAISE NOTICE 'Inventory item not found: %', v_item_name;
    RETURN;
  END IF;
  
  -- Handle purchase tasks
  IF v_task_title LIKE '%收货%' OR v_task_title LIKE '%验货%' OR v_task_title LIKE '%填写收货信息%' THEN
    v_unit_price := (v_record.submission_metadata->'structured_data'->>'unit_price')::NUMERIC;
    v_total_price := (v_record.submission_metadata->'structured_data'->>'total_price')::NUMERIC;
    
    -- Calculate missing price
    IF v_unit_price IS NULL AND v_total_price IS NOT NULL THEN
      v_unit_price := v_total_price / v_quantity;
    ELSIF v_total_price IS NULL AND v_unit_price IS NOT NULL THEN
      v_total_price := v_unit_price * v_quantity;
    END IF;
    
    IF v_unit_price IS NOT NULL AND v_total_price IS NOT NULL THEN
      -- Update inventory
      UPDATE roleplay_inventory
      SET quantity = quantity + v_quantity,
          total_price = total_price + v_total_price,
          last_updated = NOW()
      WHERE id = v_inventory_id;
      
      -- Record price history
      INSERT INTO roleplay_inventory_price_history 
      (inventory_item_id, quantity, unit_price, remaining_quantity, 
       task_record_id, transaction_type, restaurant_id)
      VALUES (v_inventory_id, v_quantity, v_unit_price, v_quantity, 
              p_task_record_id, 'purchase', v_record.restaurant_id);
      
      RAISE NOTICE 'Purchase recorded: % + % units at ¥% = ¥%', 
                   v_item_name, v_quantity, v_unit_price, v_total_price;
    END IF;
    
  -- Handle wastage tasks
  ELSIF v_task_title LIKE '%损耗%' OR v_task_title LIKE '%盘点%' THEN
    v_remaining_to_deduct := v_quantity;
    
    -- FIFO processing
    FOR v_batch IN 
      SELECT id, unit_price, remaining_quantity 
      FROM roleplay_inventory_price_history
      WHERE inventory_item_id = v_inventory_id
        AND remaining_quantity > 0
        AND transaction_type = 'purchase'
      ORDER BY created_at ASC
    LOOP
      EXIT WHEN v_remaining_to_deduct <= 0;
      
      v_deduct_qty := LEAST(v_remaining_to_deduct, v_batch.remaining_quantity);
      
      UPDATE roleplay_inventory_price_history
      SET remaining_quantity = remaining_quantity - v_deduct_qty
      WHERE id = v_batch.id;
      
      v_total_cost := v_total_cost + (v_deduct_qty * v_batch.unit_price);
      v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_qty;
    END LOOP;
    
    -- Update inventory
    UPDATE roleplay_inventory
    SET quantity = GREATEST(0, quantity - v_quantity),
        total_price = GREATEST(0, total_price - v_total_cost),
        last_updated = NOW()
    WHERE id = v_inventory_id;
    
    -- Record wastage
    INSERT INTO roleplay_inventory_price_history 
    (inventory_item_id, quantity, unit_price, remaining_quantity, 
     task_record_id, transaction_type, restaurant_id)
    VALUES (v_inventory_id, v_quantity, 
            CASE WHEN v_quantity > 0 THEN v_total_cost / v_quantity ELSE 0 END, 
            0, p_task_record_id, 'wastage', v_record.restaurant_id);
    
    RAISE NOTICE 'Wastage recorded: % - % units, cost: ¥%', 
                 v_item_name, v_quantity, v_total_cost;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_inventory_for_task_record(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_inventory_for_task_record(UUID) TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION update_inventory_for_task_record IS 
'Manually update inventory based on a task record submission. Call this after inserting a task record with structured data for 收货验货 or 损耗盘点 tasks.';