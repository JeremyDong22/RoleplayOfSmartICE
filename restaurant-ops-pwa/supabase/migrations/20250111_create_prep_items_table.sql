-- 备餐验收系统 - 菜品定义表
-- Created: 2025-01-11
-- Purpose: 存储每个餐厅的备餐菜品定义（master数据）
--
-- 设计思路：
-- 1. roleplay_prep_items: 存储每个餐厅的菜品定义
-- 2. 检查记录直接存储在 roleplay_task_records 的 structured_data 字段中
-- 3. 这样可以复用现有的任务系统，不需要额外的表
--
-- 数据流程：
-- 1. 厨师打开"备餐准备"任务
-- 2. 从 roleplay_prep_items 加载该餐厅的所有菜品
-- 3. 逐个输入每个菜品的数量和新鲜度
-- 4. 提交到 roleplay_task_records.structured_data:
--    {
--      "prep_time": "午市",
--      "items": [
--        {"item_name": "野蓝子菌菇组合", "quantity": 2, "freshness_status": "新鲜", "freshness_checked": true},
--        {"item_name": "双花碗", "quantity": 3, "freshness_status": "良好", "freshness_checked": true}
--      ]
--    }

-- ============================================
-- 1. 备餐菜品定义表
-- ============================================
CREATE TABLE IF NOT EXISTS roleplay_prep_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES roleplay_restaurants(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  check_content text NOT NULL, -- '数量' or '新鲜度' or '数量+新鲜度'
  department text NOT NULL DEFAULT '后厨', -- '前厅' or '后厨'
  category text, -- 可选分类，如'蔬菜', '肉类', '调料'等
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 确保同一餐厅的菜品名称唯一
  UNIQUE(restaurant_id, item_name)
);

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_prep_items_restaurant ON roleplay_prep_items(restaurant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prep_items_department ON roleplay_prep_items(restaurant_id, department) WHERE is_active = true;

-- ============================================
-- 2. 自动更新updated_at的触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_prep_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prep_items_updated_at ON roleplay_prep_items;
CREATE TRIGGER trigger_prep_items_updated_at
BEFORE UPDATE ON roleplay_prep_items
FOR EACH ROW
EXECUTE FUNCTION update_prep_items_updated_at();

-- ============================================
-- 3. 插入示例数据（野百灵餐厅）
-- ============================================
-- 注意：这里使用实际的餐厅ID
INSERT INTO roleplay_prep_items (restaurant_id, item_name, check_content, department, category, sort_order)
VALUES
  -- 野百灵餐厅 ID: e01868e3-5cff-4e89-9c5e-a0d4ae342b1a
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '野蓝子菌菇组合', '数量+新鲜度', '后厨', '蔬菜', 1),
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '双花碗', '数量+新鲜度', '后厨', '蔬菜', 2),
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '鲜板栗', '数量+新鲜度', '后厨', '蔬菜', 3),
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '三脆碗', '数量+新鲜度', '后厨', '蔬菜', 4),
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '姜柄瓜', '数量+新鲜度', '后厨', '蔬菜', 5),
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '鲜百合', '数量+新鲜度', '后厨', '蔬菜', 6),
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '鲜黄花', '数量+新鲜度', '后厨', '蔬菜', 7),
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '彩云土豆', '数量+新鲜度', '后厨', '蔬菜', 8),
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '石磨黑豆腐', '数量+新鲜度', '后厨', '豆制品', 9),
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '甜笋', '数量+新鲜度', '后厨', '蔬菜', 10),
  ('e01868e3-5cff-4e89-9c5e-a0d4ae342b1a', '山药', '数量+新鲜度', '后厨', '蔬菜', 11)
ON CONFLICT (restaurant_id, item_name) DO NOTHING;

-- ============================================
-- 4. RLS策略（Row Level Security）
-- ============================================
-- 启用RLS
ALTER TABLE roleplay_prep_items ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow authenticated users to read prep items" ON roleplay_prep_items;
DROP POLICY IF EXISTS "Allow managers and chefs to manage prep items" ON roleplay_prep_items;

-- 允许所有已认证用户读取菜品定义
CREATE POLICY "Allow authenticated users to read prep items"
ON roleplay_prep_items FOR SELECT
TO authenticated
USING (true);

-- 允许管理员和厨师插入/更新菜品定义
CREATE POLICY "Allow managers and chefs to manage prep items"
ON roleplay_prep_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roleplay_users
    WHERE id = auth.uid()
    AND role_code IN ('manager', 'chef', 'ceo')
  )
);

-- ============================================
-- 5. 注释说明
-- ============================================
COMMENT ON TABLE roleplay_prep_items IS '备餐菜品定义表：存储每个餐厅的菜品检查项';
COMMENT ON COLUMN roleplay_prep_items.check_content IS '检查内容：数量、新鲜度、或数量+新鲜度';
COMMENT ON COLUMN roleplay_prep_items.department IS '所属部门：前厅或后厨';
COMMENT ON COLUMN roleplay_prep_items.category IS '菜品分类：蔬菜、肉类、调料等';

-- ============================================
-- 6. 验证插入结果
-- ============================================
SELECT
  restaurant_id,
  count(*) as item_count,
  string_agg(category, ', ' ORDER BY category) as categories
FROM roleplay_prep_items
WHERE restaurant_id = 'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a'
GROUP BY restaurant_id;
