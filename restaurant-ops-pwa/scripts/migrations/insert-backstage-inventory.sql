-- Insert backstage inventory items as task records
-- This migration inserts all backstage items (vegetables, dry goods, meat/seafood, kitchenware, tableware)
-- Batch 1: Items 1 to 50
INSERT INTO roleplay_task_records (user_id, restaurant_id, task_id, structured_data, created_at, updated_at)
VALUES (
  '24b7a49d-2bbb-4d1f-bc99-d45d2822b7e6',
  'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a',
  'bc61c086-6b59-431c-8ae8-cc4b1e0fb9f0',
  '{
  "action_type": "count",
  "items": [
    {
      "name": "血皮菜",
      "quantity": 0.5,
      "unit": "斤",
      "price": 3.5,
      "category": "vegetable"
    },
    {
      "name": "鲜黄花",
      "quantity": 0.7,
      "unit": "袋",
      "price": 13.0,
      "category": "vegetable"
    },
    {
      "name": "粗山药",
      "quantity": 3.9,
      "unit": "斤",
      "price": 3.5,
      "category": "vegetable"
    },
    {
      "name": "干花菜",
      "quantity": 10.0,
      "unit": "斤",
      "price": 25.0,
      "category": "vegetable"
    },
    {
      "name": "干贡菜",
      "quantity": 5.0,
      "unit": "斤",
      "price": 40.0,
      "category": "vegetable"
    },
    {
      "name": "干黄花",
      "quantity": 16.0,
      "unit": "斤",
      "price": 40.0,
      "category": "vegetable"
    },
    {
      "name": "姜柄瓜",
      "quantity": 3.0,
      "unit": "斤",
      "price": 10.0,
      "category": "vegetable"
    },
    {
      "name": "花生芽",
      "quantity": 5.0,
      "unit": "袋",
      "price": 4.5,
      "category": "vegetable"
    },
    {
      "name": "七彩土豆",
      "quantity": 6.9,
      "unit": "斤",
      "price": 7.0,
      "category": "vegetable"
    },
    {
      "name": "藕",
      "quantity": 7.0,
      "unit": "斤",
      "price": 6.0,
      "category": "vegetable"
    },
    {
      "name": "豌豆尖",
      "quantity": 9.0,
      "unit": "斤",
      "price": 0,
      "category": "vegetable"
    },
    {
      "name": "黑豆腐",
      "quantity": 4.0,
      "unit": "碗",
      "price": 4.5,
      "category": "vegetable"
    },
    {
      "name": "牛肝菌",
      "quantity": 2.0,
      "unit": "斤",
      "price": 32.0,
      "category": "vegetable"
    },
    {
      "name": "鹿茸菇",
      "quantity": 3.0,
      "unit": "袋",
      "price": 3.5,
      "category": "vegetable"
    },
    {
      "name": "绣球菌",
      "quantity": 3.0,
      "unit": "袋",
      "price": 4.5,
      "category": "vegetable"
    },
    {
      "name": "金耳菌",
      "quantity": 1.0,
      "unit": "斤",
      "price": 15.0,
      "category": "vegetable"
    },
    {
      "name": "土豆",
      "quantity": 25.0,
      "unit": "斤",
      "price": 1.5,
      "category": "vegetable"
    },
    {
      "name": "姜",
      "quantity": 3.6,
      "unit": "斤",
      "price": 4.7,
      "category": "vegetable"
    },
    {
      "name": "大蒜",
      "quantity": 7.7,
      "unit": "斤",
      "price": 3.3,
      "category": "vegetable"
    },
    {
      "name": "蒜苗",
      "quantity": 0.5,
      "unit": "斤",
      "price": 3.8,
      "category": "vegetable"
    },
    {
      "name": "螺丝椒",
      "quantity": 2.0,
      "unit": "斤",
      "price": 2.7,
      "category": "vegetable"
    },
    {
      "name": "番茄",
      "quantity": 8.0,
      "unit": "斤",
      "price": 2.3,
      "category": "vegetable"
    },
    {
      "name": "茄子",
      "quantity": 1.9,
      "unit": "斤",
      "price": 1.2,
      "category": "vegetable"
    },
    {
      "name": "柠檬",
      "quantity": 3.6,
      "unit": "斤",
      "price": 8.5,
      "category": "vegetable"
    },
    {
      "name": "鲜花椒",
      "quantity": 3.0,
      "unit": "袋",
      "price": 6.5,
      "category": "vegetable"
    },
    {
      "name": "大香菜",
      "quantity": 0.3,
      "unit": "斤",
      "price": 22.0,
      "category": "vegetable"
    },
    {
      "name": "美人椒",
      "quantity": 0.6,
      "unit": "斤",
      "price": 8.5,
      "category": "vegetable"
    },
    {
      "name": "芭蕉叶",
      "quantity": 1.7,
      "unit": "斤",
      "price": 10.0,
      "category": "vegetable"
    },
    {
      "name": "绿豆芽",
      "quantity": 0.5,
      "unit": "斤",
      "price": 1.5,
      "category": "vegetable"
    },
    {
      "name": "黄瓜",
      "quantity": 1.4,
      "unit": "斤",
      "price": 2.3,
      "category": "vegetable"
    },
    {
      "name": "青笋",
      "quantity": 3.0,
      "unit": "斤",
      "price": 2.2,
      "category": "vegetable"
    },
    {
      "name": "海带丝",
      "quantity": 0.5,
      "unit": "斤",
      "price": 2.25,
      "category": "vegetable"
    },
    {
      "name": "泡萝卜",
      "quantity": 1.5,
      "unit": "斤",
      "price": 3.5,
      "category": "vegetable"
    },
    {
      "name": "黄豆芽",
      "quantity": 1.0,
      "unit": "斤",
      "price": 1.5,
      "category": "vegetable"
    },
    {
      "name": "大葱",
      "quantity": 0.5,
      "unit": "斤",
      "price": 2.5,
      "category": "vegetable"
    },
    {
      "name": "法香",
      "quantity": 2.5,
      "unit": "斤",
      "price": 8.0,
      "category": "vegetable"
    },
    {
      "name": "千叶吊兰",
      "quantity": 1.0,
      "unit": "盆",
      "price": 15.0,
      "category": "vegetable"
    },
    {
      "name": "薄荷",
      "quantity": 2.0,
      "unit": "斤",
      "price": 0,
      "category": "vegetable"
    },
    {
      "name": "紫苏叶",
      "quantity": 0.4,
      "unit": "斤",
      "price": 0,
      "category": "vegetable"
    },
    {
      "name": "莲白",
      "quantity": 12.2,
      "unit": "斤",
      "price": 0.9,
      "category": "vegetable"
    },
    {
      "name": "羽衣甘蓝",
      "quantity": 1.5,
      "unit": "斤",
      "price": 10.0,
      "category": "vegetable"
    },
    {
      "name": "红叶生菜",
      "quantity": 0.5,
      "unit": "斤",
      "price": 12.0,
      "category": "vegetable"
    },
    {
      "name": "口蘑",
      "quantity": 0.5,
      "unit": "斤",
      "price": 10.0,
      "category": "vegetable"
    },
    {
      "name": "甜菊",
      "quantity": 14.0,
      "unit": "支",
      "price": 6.0,
      "category": "vegetable"
    },
    {
      "name": "粽叶",
      "quantity": 1.0,
      "unit": "袋",
      "price": 8.0,
      "category": "vegetable"
    },
    {
      "name": "甜笋",
      "quantity": 9.8,
      "unit": "斤",
      "price": 0,
      "category": "vegetable"
    },
    {
      "name": "白芹菜",
      "quantity": 1.0,
      "unit": "斤",
      "price": 4.0,
      "category": "vegetable"
    },
    {
      "name": "野菜卷",
      "quantity": 75.0,
      "unit": "袋",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "色拉油",
      "quantity": 1.0,
      "unit": "桶",
      "price": 240.0,
      "category": "dry_goods"
    },
    {
      "name": "鸡精",
      "quantity": 5.0,
      "unit": "袋",
      "price": 72.0,
      "category": "dry_goods"
    }
  ]
}'::jsonb,
  NOW(),
  NOW()
);

-- Batch 2: Items 51 to 100
INSERT INTO roleplay_task_records (user_id, restaurant_id, task_id, structured_data, created_at, updated_at)
VALUES (
  '24b7a49d-2bbb-4d1f-bc99-d45d2822b7e6',
  'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a',
  'bc61c086-6b59-431c-8ae8-cc4b1e0fb9f0',
  '{
  "action_type": "count",
  "items": [
    {
      "name": "味精",
      "quantity": 9.0,
      "unit": "袋",
      "price": 16.0,
      "category": "dry_goods"
    },
    {
      "name": "盐",
      "quantity": 24.0,
      "unit": "袋",
      "price": 0.8,
      "category": "dry_goods"
    },
    {
      "name": "胡椒粉",
      "quantity": 0.2,
      "unit": "斤",
      "price": 40.0,
      "category": "dry_goods"
    },
    {
      "name": "花椒粉",
      "quantity": 0.3,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "五香粉",
      "quantity": 3.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "小麦自发粉",
      "quantity": 8.0,
      "unit": "斤",
      "price": 1.5,
      "category": "dry_goods"
    },
    {
      "name": "木姜子油",
      "quantity": 35.0,
      "unit": "瓶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "金蒜酥",
      "quantity": 17.0,
      "unit": "袋",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "黑松露酱",
      "quantity": 4.5,
      "unit": "瓶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "生粉",
      "quantity": 1.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "红薯淀粉",
      "quantity": 3.0,
      "unit": "斤",
      "price": 6.0,
      "category": "dry_goods"
    },
    {
      "name": "墨鱼汁",
      "quantity": 2.0,
      "unit": "瓶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "红油",
      "quantity": 1.5,
      "unit": "桶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "草果粉",
      "quantity": 0.37,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "白糖",
      "quantity": 3.0,
      "unit": "斤",
      "price": 3.8,
      "category": "dry_goods"
    },
    {
      "name": "糍粑辣椒",
      "quantity": 16.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "郫县豆瓣",
      "quantity": 1.0,
      "unit": "桶",
      "price": 28.0,
      "category": "dry_goods"
    },
    {
      "name": "黄心皮蛋",
      "quantity": 92.0,
      "unit": "个",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "家乐柠檬粉",
      "quantity": 34.0,
      "unit": "袋",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "泰船味露",
      "quantity": 2.5,
      "unit": "桶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "糊辣椒",
      "quantity": 20.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "贵州五香辣椒面",
      "quantity": 28.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "春卷皮",
      "quantity": 11.0,
      "unit": "包",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "脆哨",
      "quantity": 10.0,
      "unit": "袋",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "豆腐圆子",
      "quantity": 43.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "苹果醋",
      "quantity": 10.0,
      "unit": "瓶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "糟辣椒",
      "quantity": 38.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "大米",
      "quantity": 25.0,
      "unit": "斤",
      "price": 4.8,
      "category": "dry_goods"
    },
    {
      "name": "鸡蛋",
      "quantity": 8.0,
      "unit": "斤",
      "price": 3.6,
      "category": "dry_goods"
    },
    {
      "name": "脆哨沫",
      "quantity": 30.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "软哨片",
      "quantity": 4.4,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "芥末",
      "quantity": 1.0,
      "unit": "管",
      "price": 5.5,
      "category": "dry_goods"
    },
    {
      "name": "香油",
      "quantity": 1.0,
      "unit": "桶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "蚝油",
      "quantity": 1.0,
      "unit": "桶",
      "price": 20.0,
      "category": "dry_goods"
    },
    {
      "name": "干巴菌",
      "quantity": 2.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "干红花椒",
      "quantity": 0.3,
      "unit": "斤",
      "price": 110.0,
      "category": "dry_goods"
    },
    {
      "name": "干玫瑰花",
      "quantity": 0.5,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "鸡油",
      "quantity": 2.7,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "东古酱油",
      "quantity": 10.0,
      "unit": "瓶",
      "price": 9.0,
      "category": "dry_goods"
    },
    {
      "name": "新一代辣椒面",
      "quantity": 1.0,
      "unit": "斤",
      "price": 16.0,
      "category": "dry_goods"
    },
    {
      "name": "帕玛森干酪",
      "quantity": 16.0,
      "unit": "包",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "香草冰淇淋",
      "quantity": 3.0,
      "unit": "桶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "碧根果碎",
      "quantity": 2.0,
      "unit": "瓶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "黄天鹅无菌蛋",
      "quantity": 190.0,
      "unit": "个",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "乳扇",
      "quantity": 4.5,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "干香茅草",
      "quantity": 18.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "黄灯笼辣椒酱",
      "quantity": 1.0,
      "unit": "瓶",
      "price": 10.0,
      "category": "dry_goods"
    },
    {
      "name": "蒜蓉辣椒酱",
      "quantity": 1.0,
      "unit": "桶",
      "price": 68.0,
      "category": "dry_goods"
    },
    {
      "name": "玫瑰酱",
      "quantity": 0.5,
      "unit": "桶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "百香果原汁",
      "quantity": 24.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    }
  ]
}'::jsonb,
  NOW(),
  NOW()
);

-- Batch 3: Items 101 to 150
INSERT INTO roleplay_task_records (user_id, restaurant_id, task_id, structured_data, created_at, updated_at)
VALUES (
  '24b7a49d-2bbb-4d1f-bc99-d45d2822b7e6',
  'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a',
  'bc61c086-6b59-431c-8ae8-cc4b1e0fb9f0',
  '{
  "action_type": "count",
  "items": [
    {
      "name": "蘸料辣椒",
      "quantity": 27.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "烧椒",
      "quantity": 15.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "豆腐乳",
      "quantity": 5.0,
      "unit": "瓶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "水豆豉",
      "quantity": 22.0,
      "unit": "瓶",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "酸汤底料",
      "quantity": 5642.0,
      "unit": "袋",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "干冰",
      "quantity": 2.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "花生碎",
      "quantity": 5.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "脆三丁",
      "quantity": 36.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "木姜子",
      "quantity": 20.0,
      "unit": "斤",
      "price": 0,
      "category": "dry_goods"
    },
    {
      "name": "吊龙",
      "quantity": 33.0,
      "unit": "斤",
      "price": 96.0,
      "category": "meat_seafood"
    },
    {
      "name": "匙仁",
      "quantity": 7.3,
      "unit": "斤",
      "price": 84.0,
      "category": "meat_seafood"
    },
    {
      "name": "胸口油",
      "quantity": 6.2,
      "unit": "斤",
      "price": 96.0,
      "category": "meat_seafood"
    },
    {
      "name": "五花腱",
      "quantity": 6.8,
      "unit": "斤",
      "price": 80.0,
      "category": "meat_seafood"
    },
    {
      "name": "M9和牛",
      "quantity": 16.0,
      "unit": "斤",
      "price": 140.0,
      "category": "meat_seafood"
    },
    {
      "name": "和牛肉糜",
      "quantity": 8.0,
      "unit": "斤",
      "price": 51.0,
      "category": "meat_seafood"
    },
    {
      "name": "去骨鸡腿肉",
      "quantity": 36.0,
      "unit": "斤",
      "price": 7.61,
      "category": "meat_seafood"
    },
    {
      "name": "猪蹄",
      "quantity": 2.0,
      "unit": "斤",
      "price": 20.0,
      "category": "meat_seafood"
    },
    {
      "name": "鸡爪",
      "quantity": 5.0,
      "unit": "斤",
      "price": 0,
      "category": "meat_seafood"
    },
    {
      "name": "雪花松板肉",
      "quantity": 25.0,
      "unit": "袋",
      "price": 16.0,
      "category": "meat_seafood"
    },
    {
      "name": "猪响皮",
      "quantity": 28.0,
      "unit": "斤",
      "price": 49.02,
      "category": "meat_seafood"
    },
    {
      "name": "糯米午餐肉",
      "quantity": 143.0,
      "unit": "罐",
      "price": 10.2,
      "category": "meat_seafood"
    },
    {
      "name": "猪肉沫",
      "quantity": 9.7,
      "unit": "斤",
      "price": 0,
      "category": "meat_seafood"
    },
    {
      "name": "宣威火腿",
      "quantity": 10.0,
      "unit": "斤",
      "price": 72.02,
      "category": "meat_seafood"
    },
    {
      "name": "肥牛肉",
      "quantity": 6.9,
      "unit": "斤",
      "price": 0,
      "category": "meat_seafood"
    },
    {
      "name": "带皮牛肉",
      "quantity": 31.0,
      "unit": "袋",
      "price": 0,
      "category": "meat_seafood"
    },
    {
      "name": "基围虾",
      "quantity": 0.6,
      "unit": "斤",
      "price": 38.0,
      "category": "meat_seafood"
    },
    {
      "name": "乌鱼片",
      "quantity": 10.0,
      "unit": "盒",
      "price": 22.7,
      "category": "meat_seafood"
    },
    {
      "name": "虾滑",
      "quantity": 21.0,
      "unit": "袋",
      "price": 10.5,
      "category": "meat_seafood"
    },
    {
      "name": "10头鲍",
      "quantity": 1.8,
      "unit": "斤",
      "price": 42.0,
      "category": "meat_seafood"
    },
    {
      "name": "小管",
      "quantity": 19.0,
      "unit": "袋",
      "price": 0,
      "category": "meat_seafood"
    },
    {
      "name": "生蚝",
      "quantity": 3.2,
      "unit": "斤",
      "price": 8.5,
      "category": "meat_seafood"
    },
    {
      "name": "罗非鱼",
      "quantity": 2.6,
      "unit": "斤",
      "price": 14.0,
      "category": "meat_seafood"
    },
    {
      "name": "花胶",
      "quantity": 42.0,
      "unit": "袋",
      "price": 0,
      "category": "meat_seafood"
    },
    {
      "name": "双头燃气灶",
      "quantity": 1.0,
      "unit": "台",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "电磁炉",
      "quantity": 1.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "单头汤炉",
      "quantity": 2.0,
      "unit": "台",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "制冰机-后厨",
      "quantity": 1.0,
      "unit": "台",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "洗碗机",
      "quantity": 1.0,
      "unit": "台",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "热水器",
      "quantity": 1.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "蒸饭柜",
      "quantity": 1.0,
      "unit": "台",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "玻璃冷藏展示柜",
      "quantity": 2.0,
      "unit": "台",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "冷藏工作台",
      "quantity": 1.0,
      "unit": "台",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "冷冻工作台",
      "quantity": 3.0,
      "unit": "台",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "双温立式冰柜",
      "quantity": 1.0,
      "unit": "台",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "雪柜（仓库）",
      "quantity": 1.0,
      "unit": "台",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "炒锅-小",
      "quantity": 2.0,
      "unit": "口",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "炒锅-大",
      "quantity": 1.0,
      "unit": "口",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "炒勺",
      "quantity": 2.0,
      "unit": "把",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "平底锅",
      "quantity": 1.0,
      "unit": "口",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "切刀",
      "quantity": 5.0,
      "unit": "把",
      "price": 0,
      "category": "fixed_kitchenware"
    }
  ]
}'::jsonb,
  NOW(),
  NOW()
);

-- Batch 4: Items 151 to 187
INSERT INTO roleplay_task_records (user_id, restaurant_id, task_id, structured_data, created_at, updated_at)
VALUES (
  '24b7a49d-2bbb-4d1f-bc99-d45d2822b7e6',
  'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a',
  'bc61c086-6b59-431c-8ae8-cc4b1e0fb9f0',
  '{
  "action_type": "count",
  "items": [
    {
      "name": "砍刀",
      "quantity": 2.0,
      "unit": "把",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "水果刀",
      "quantity": 2.0,
      "unit": "把",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "菜墩",
      "quantity": 2.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "肉墩",
      "quantity": 2.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "其它菜板",
      "quantity": 3.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_kitchenware"
    },
    {
      "name": "手作粗陶元宝碗（糟辣椒炒饭）",
      "quantity": 12.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "日式陶瓷味碟（苗侗空气丸子蘸料碗）",
      "quantity": 15.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "不规则方锥形小碗（水晶滑肉）",
      "quantity": 53.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "不规则方形小碗（另外一种）",
      "quantity": 56.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "圆形单层U型碗（软哨/鲜百合）",
      "quantity": 26.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "格雷草帽碗（紫苏桃子）",
      "quantity": 13.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "铸铁锅30cm",
      "quantity": 25.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "铸铁锅32cm",
      "quantity": 2.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "反冰长嘴碗（云山雪花吊龙）",
      "quantity": 20.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "竹板（云山雪花吊龙）",
      "quantity": 20.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "干冰壶",
      "quantity": 8.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "9英寸长方深盘（木姜子黄牛肉）",
      "quantity": 51.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "13英寸长方盘（糊辣椒黄牛匙仁）",
      "quantity": 49.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "加号长方和牛木盒（大地飞雪）",
      "quantity": 15.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "12英寸高尔夫长方盘（乌鱼片）",
      "quantity": 18.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "8英寸雷灵汤盘（干巴菌炒饭）",
      "quantity": 34.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "10英寸随意木碗（黑金虾滑）",
      "quantity": 20.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "10英寸双耳陶艺碗（海鲜拼盘）",
      "quantity": 9.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "12cm圆筒水草蓝（鲜板栗）",
      "quantity": 60.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "16cm圆筒水草蓝",
      "quantity": 30.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "中号椭圆橡木碗（血皮菜）",
      "quantity": 31.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "小号椭圆橡木碗（藕片）",
      "quantity": 20.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "椭圆水草蓝（菌菇组合）",
      "quantity": 30.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "长方形海棠玻璃托盘（丝娃娃）",
      "quantity": 14.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "日式创意陶泥色8.5螺纹（鲜虾）",
      "quantity": 15.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "双耳锤点锅（铜锅油焖鸡）",
      "quantity": 19.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "平底双耳锅20cm（冰淇淋雪顶玉米粑）",
      "quantity": 59.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "椭圆盘-黄（手撕罗非鱼）",
      "quantity": 15.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "小吃勺（冰淇淋雪顶玉米粑）",
      "quantity": 48.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "锅底汤勺",
      "quantity": 35.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "锅底漏勺",
      "quantity": 44.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    },
    {
      "name": "苗侗空气丸子小勺",
      "quantity": 12.0,
      "unit": "个",
      "price": 0,
      "category": "fixed_tableware"
    }
  ]
}'::jsonb,
  NOW(),
  NOW()
);

-- Verify the insertion
SELECT 
  COUNT(*) as total_records,
  SUM(jsonb_array_length(structured_data->'items')) as total_items
FROM roleplay_task_records
WHERE task_id = 'bc61c086-6b59-431c-8ae8-cc4b1e0fb9f0'
  AND user_id = '24b7a49d-2bbb-4d1f-bc99-d45d2822b7e6';

-- Check inventory view
SELECT 
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE quantity > 0) as items_with_quantity
FROM roleplay_inventory_fifo_view;
