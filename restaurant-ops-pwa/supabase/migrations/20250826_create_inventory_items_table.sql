-- Migration: Create roleplay_inventory_items table
-- Created: 2025-08-26
-- Purpose: Create a clean items master table for inventory management

-- Step 1: Create the new roleplay_inventory_items table
CREATE TABLE IF NOT EXISTS public.roleplay_inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  item_name varchar(255) NOT NULL,
  unit varchar(50) NOT NULL,
  department varchar(50) NOT NULL,
  category varchar(100),
  subcategory varchar(100),
  distribution_channel varchar(50),
  warning_quantity numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Primary key
  CONSTRAINT roleplay_inventory_items_pkey PRIMARY KEY (id),
  
  -- Foreign key to restaurants
  CONSTRAINT roleplay_inventory_items_restaurant_id_fkey 
    FOREIGN KEY (restaurant_id) 
    REFERENCES roleplay_restaurants(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: each item name should be unique per restaurant
  CONSTRAINT roleplay_inventory_items_unique_item_per_restaurant 
    UNIQUE (restaurant_id, item_name)
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_roleplay_inventory_items_restaurant_id 
  ON roleplay_inventory_items(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_roleplay_inventory_items_item_name 
  ON roleplay_inventory_items(item_name);

CREATE INDEX IF NOT EXISTS idx_roleplay_inventory_items_department 
  ON roleplay_inventory_items(department);

CREATE INDEX IF NOT EXISTS idx_roleplay_inventory_items_category 
  ON roleplay_inventory_items(category);

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE roleplay_inventory_items ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Allow all authenticated users to read items from their restaurant
CREATE POLICY "Users can view items from their restaurant" 
  ON roleplay_inventory_items 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM roleplay_users 
      WHERE roleplay_users.id = auth.uid() 
      AND roleplay_users.restaurant_id = roleplay_inventory_items.restaurant_id
    )
  );

-- Allow authenticated users to insert items for their restaurant
CREATE POLICY "Users can create items for their restaurant" 
  ON roleplay_inventory_items 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roleplay_users 
      WHERE roleplay_users.id = auth.uid() 
      AND roleplay_users.restaurant_id = roleplay_inventory_items.restaurant_id
    )
  );

-- Allow authenticated users to update items from their restaurant
CREATE POLICY "Users can update items from their restaurant" 
  ON roleplay_inventory_items 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM roleplay_users 
      WHERE roleplay_users.id = auth.uid() 
      AND roleplay_users.restaurant_id = roleplay_inventory_items.restaurant_id
    )
  );

-- Allow authenticated users to delete items from their restaurant
CREATE POLICY "Users can delete items from their restaurant" 
  ON roleplay_inventory_items 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM roleplay_users 
      WHERE roleplay_users.id = auth.uid() 
      AND roleplay_users.restaurant_id = roleplay_inventory_items.restaurant_id
    )
  );

-- Step 5: Grant permissions
GRANT ALL ON roleplay_inventory_items TO authenticated;
GRANT SELECT ON roleplay_inventory_items TO anon;

-- Step 6: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roleplay_inventory_items_updated_at 
  BEFORE UPDATE ON roleplay_inventory_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Migrate data from roleplay_inventory to roleplay_inventory_items
-- Only migrate unique item definitions (not quantities or prices)
INSERT INTO roleplay_inventory_items (
  restaurant_id,
  item_name,
  unit,
  department,
  category,
  subcategory,
  distribution_channel,
  warning_quantity,
  created_at,
  updated_at
)
SELECT DISTINCT ON (restaurant_id, item_name)
  restaurant_id,
  item_name,
  unit,
  department,
  category,
  subcategory,
  distribution_channel,
  COALESCE(warning_quantity, 0),
  COALESCE(created_at, now()),
  COALESCE(last_updated, now())
FROM roleplay_inventory
WHERE restaurant_id IS NOT NULL
  AND item_name IS NOT NULL
  AND unit IS NOT NULL
  AND department IS NOT NULL
ORDER BY restaurant_id, item_name, created_at;

-- Step 8: Add comment to table for documentation
COMMENT ON TABLE roleplay_inventory_items IS 
'Master table for inventory item definitions. Contains item metadata but not quantities or stock levels.';

COMMENT ON COLUMN roleplay_inventory_items.restaurant_id IS 'Restaurant that owns this item';
COMMENT ON COLUMN roleplay_inventory_items.item_name IS 'Unique name of the item within the restaurant';
COMMENT ON COLUMN roleplay_inventory_items.unit IS 'Unit of measurement (个, kg, 瓶, etc.)';
COMMENT ON COLUMN roleplay_inventory_items.department IS 'Department (前厅, 后厨)';
COMMENT ON COLUMN roleplay_inventory_items.category IS 'Main category of the item';
COMMENT ON COLUMN roleplay_inventory_items.subcategory IS 'Subcategory of the item';
COMMENT ON COLUMN roleplay_inventory_items.distribution_channel IS 'Distribution channel (本地, 网购, etc.)';
COMMENT ON COLUMN roleplay_inventory_items.warning_quantity IS 'Quantity threshold for low stock warning';

-- Step 9: Create a view to check migration results
CREATE OR REPLACE VIEW roleplay_inventory_migration_check AS
SELECT 
  'Original roleplay_inventory' as source,
  COUNT(DISTINCT CONCAT(restaurant_id, '|', item_name)) as unique_items,
  COUNT(*) as total_records
FROM roleplay_inventory
WHERE restaurant_id IS NOT NULL AND item_name IS NOT NULL

UNION ALL

SELECT 
  'New roleplay_inventory_items' as source,
  COUNT(*) as unique_items,
  COUNT(*) as total_records
FROM roleplay_inventory_items;

-- Grant permissions for the view
GRANT SELECT ON roleplay_inventory_migration_check TO authenticated;