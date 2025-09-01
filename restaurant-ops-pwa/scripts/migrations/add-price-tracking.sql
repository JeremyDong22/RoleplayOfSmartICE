-- Migration to add price tracking for inventory management
-- Created: 2025-01-12
-- Purpose: Add price fields to inventory and create FIFO price history tracking

-- 1. Add total_price column to inventory table
ALTER TABLE roleplay_inventory 
ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2) DEFAULT 0;

-- 2. Create price history table for FIFO calculations
CREATE TABLE IF NOT EXISTS roleplay_inventory_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES roleplay_inventory(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  remaining_quantity NUMERIC(10,2) NOT NULL, -- For FIFO tracking
  task_record_id UUID REFERENCES roleplay_task_records(id) ON DELETE SET NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'wastage', 'consume')),
  restaurant_id UUID REFERENCES roleplay_restaurants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_history_inventory 
ON roleplay_inventory_price_history(inventory_item_id, created_at);

CREATE INDEX IF NOT EXISTS idx_price_history_remaining 
ON roleplay_inventory_price_history(inventory_item_id, remaining_quantity)
WHERE remaining_quantity > 0;

-- 4. Function to handle purchase (收货验货)
CREATE OR REPLACE FUNCTION update_inventory_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_quantity NUMERIC;
  v_unit_price NUMERIC;
  v_total_price NUMERIC;
  v_inventory_id UUID;
  v_item_name VARCHAR;
BEGIN
  -- Only process records with structured_data containing price info
  IF NEW.submission_metadata ? 'structured_data' 
     AND NEW.submission_metadata->'structured_data' ? 'item_name'
     AND (NEW.submission_metadata->'structured_data' ? 'unit_price' 
          OR NEW.submission_metadata->'structured_data' ? 'total_price') THEN
    
    -- Extract data from metadata
    v_item_name := NEW.submission_metadata->'structured_data'->>'item_name';
    v_quantity := COALESCE((NEW.submission_metadata->'structured_data'->>'quantity')::NUMERIC, 0);
    
    -- Calculate prices (one might be null)
    v_unit_price := (NEW.submission_metadata->'structured_data'->>'unit_price')::NUMERIC;
    v_total_price := (NEW.submission_metadata->'structured_data'->>'total_price')::NUMERIC;
    
    -- If only one price is provided, calculate the other
    IF v_unit_price IS NULL AND v_total_price IS NOT NULL AND v_quantity > 0 THEN
      v_unit_price := v_total_price / v_quantity;
    ELSIF v_total_price IS NULL AND v_unit_price IS NOT NULL THEN
      v_total_price := v_unit_price * v_quantity;
    END IF;
    
    -- Skip if we don't have valid prices
    IF v_unit_price IS NULL OR v_total_price IS NULL OR v_quantity <= 0 THEN
      RETURN NEW;
    END IF;
    
    -- Get inventory item ID
    SELECT id INTO v_inventory_id 
    FROM roleplay_inventory 
    WHERE item_name = v_item_name 
      AND restaurant_id = NEW.restaurant_id
    LIMIT 1;
    
    IF v_inventory_id IS NOT NULL THEN
      -- Update inventory totals
      UPDATE roleplay_inventory
      SET quantity = quantity + v_quantity,
          total_price = total_price + v_total_price,
          last_updated = NOW()
      WHERE id = v_inventory_id;
      
      -- Record in price history for FIFO
      INSERT INTO roleplay_inventory_price_history 
      (inventory_item_id, quantity, unit_price, remaining_quantity, 
       task_record_id, transaction_type, restaurant_id)
      VALUES (v_inventory_id, v_quantity, v_unit_price, v_quantity, 
              NEW.id, 'purchase', NEW.restaurant_id);
      
      RAISE NOTICE 'Inventory updated: % + % units at ¥% = ¥%', 
                   v_item_name, v_quantity, v_unit_price, v_total_price;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to handle wastage (损耗盘点) with FIFO
CREATE OR REPLACE FUNCTION update_inventory_on_wastage()
RETURNS TRIGGER AS $$
DECLARE
  v_quantity NUMERIC;
  v_total_cost NUMERIC := 0;
  v_inventory_id UUID;
  v_item_name VARCHAR;
  v_remaining_to_deduct NUMERIC;
  v_batch RECORD;
  v_deduct_qty NUMERIC;
BEGIN
  -- Only process wastage records
  IF NEW.submission_metadata ? 'structured_data' 
     AND NEW.submission_metadata->'structured_data' ? 'item_name'
     AND NEW.submission_metadata->'structured_data' ? 'quantity' THEN
    
    v_item_name := NEW.submission_metadata->'structured_data'->>'item_name';
    v_quantity := (NEW.submission_metadata->'structured_data'->>'quantity')::NUMERIC;
    
    -- Get inventory item ID
    SELECT id INTO v_inventory_id 
    FROM roleplay_inventory 
    WHERE item_name = v_item_name 
      AND restaurant_id = NEW.restaurant_id
    LIMIT 1;
    
    IF v_inventory_id IS NOT NULL AND v_quantity > 0 THEN
      v_remaining_to_deduct := v_quantity;
      
      -- Process FIFO deduction
      FOR v_batch IN 
        SELECT id, unit_price, remaining_quantity 
        FROM roleplay_inventory_price_history
        WHERE inventory_item_id = v_inventory_id
          AND remaining_quantity > 0
          AND transaction_type = 'purchase'
        ORDER BY created_at ASC -- FIFO: oldest first
      LOOP
        EXIT WHEN v_remaining_to_deduct <= 0;
        
        -- Calculate how much to deduct from this batch
        v_deduct_qty := LEAST(v_remaining_to_deduct, v_batch.remaining_quantity);
        
        -- Update the batch's remaining quantity
        UPDATE roleplay_inventory_price_history
        SET remaining_quantity = remaining_quantity - v_deduct_qty
        WHERE id = v_batch.id;
        
        -- Accumulate the cost
        v_total_cost := v_total_cost + (v_deduct_qty * v_batch.unit_price);
        
        -- Reduce remaining quantity to deduct
        v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_qty;
      END LOOP;
      
      -- Update inventory totals
      UPDATE roleplay_inventory
      SET quantity = GREATEST(0, quantity - v_quantity),
          total_price = GREATEST(0, total_price - v_total_cost),
          last_updated = NOW()
      WHERE id = v_inventory_id;
      
      -- Record wastage in price history
      INSERT INTO roleplay_inventory_price_history 
      (inventory_item_id, quantity, unit_price, remaining_quantity, 
       task_record_id, transaction_type, restaurant_id)
      VALUES (v_inventory_id, v_quantity, 
              CASE WHEN v_quantity > 0 THEN v_total_cost / v_quantity ELSE 0 END, 
              0, NEW.id, 'wastage', NEW.restaurant_id);
      
      RAISE NOTICE 'Wastage recorded: % - % units, cost: ¥%', 
                   v_item_name, v_quantity, v_total_cost;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for automatic updates
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_inventory_purchase ON roleplay_task_records;
DROP TRIGGER IF EXISTS trigger_inventory_wastage ON roleplay_task_records;

-- Trigger for purchase tasks (收货验货)
CREATE TRIGGER trigger_inventory_purchase
AFTER INSERT ON roleplay_task_records
FOR EACH ROW
WHEN (NEW.status = 'submitted' 
      AND EXISTS (
        SELECT 1 FROM roleplay_tasks t 
        WHERE t.id = NEW.task_id 
        AND t.title LIKE '%收货%'
      ))
EXECUTE FUNCTION update_inventory_on_purchase();

-- Trigger for wastage tasks (损耗盘点)
CREATE TRIGGER trigger_inventory_wastage
AFTER INSERT ON roleplay_task_records
FOR EACH ROW
WHEN (NEW.status = 'submitted' 
      AND EXISTS (
        SELECT 1 FROM roleplay_tasks t 
        WHERE t.id = NEW.task_id 
        AND (t.title LIKE '%损耗%' OR t.title LIKE '%盘点%')
      ))
EXECUTE FUNCTION update_inventory_on_wastage();

-- 7. Grant permissions
GRANT ALL ON roleplay_inventory_price_history TO authenticated;
GRANT ALL ON roleplay_inventory_price_history TO service_role;

-- 8. Add comment for documentation
COMMENT ON TABLE roleplay_inventory_price_history IS 'Tracks purchase and consumption history for FIFO price calculations';
COMMENT ON COLUMN roleplay_inventory.total_price IS 'Total value of current inventory calculated using FIFO';