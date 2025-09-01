-- Initial inventory count for system initialization
-- Date: August 31, 2024
-- Items: 368 items with quantity 0

INSERT INTO roleplay_task_records (
    id,
    user_id,
    restaurant_id,
    task_id,
    date,
    period_id,
    status,
    is_floating,
    is_late,
    is_makeup,
    submission_type,
    text_content,
    submission_metadata,
    created_at,
    updated_at,
    review_status,
    reviewed_by,
    reviewed_at
) VALUES (
    '7f537638-20f8-46b1-b59d-58b9ee37915e',
    '24b7a49d-2bbb-4d1f-bc99-d45d2822b7e6',
    'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a',
    'inventory-count-task-bc61c086-6b59-431c-8ae8-cc4b1e0fb9f0',
    '2025-08-31',
    NULL,
    'submitted',
    false,
    false,
    false,
    'text',
    $$物品1: 鲜板栗\n物品2: 鲜百合\n物品3: 血皮菜\n物品4: 鲜黄花\n物品5: 粗山药\n物品6: 干花菜\n物品7: 干贡菜\n物品8: 干黄花\n物品9: 姜柄瓜\n物品10: 花生芽\n物品11: 黄瓜花\n物品12: 七彩土豆\n物品13: 藕\n物品14: 豌豆尖\n物品15: 黑豆腐\n物品16: 牛肝菌\n物品17: 球盖菇\n物品18: 鹿茸菇\n物品19: 绣球菌\n物品20: 金耳菌\n物品21: 土豆\n物品22: 姜\n物品23: 大蒜\n物品24: 小米辣\n物品25: 香茅\n物品26: 蒜苗\n物品27: 螺丝椒\n物品28: 番茄\n物品29: 折耳根\n物品30: 茄子\n物品31: 柠檬\n物品32: 鲜花椒\n物品33: 香菜\n物品34: 大香菜\n物品35: 美人椒\n物品36: 小青柠\n物品37: 芭蕉叶\n物品38: 绿豆芽\n物品39: 黄瓜\n物品40: 青笋\n物品41: 豆皮\n物品42: 海带丝\n物品43: 凉面\n物品44: 泡萝卜\n物品45: 二荆条\n物品46: 黄豆芽\n物品47: 小葱\n物品48: 大葱\n物品49: 法香\n物品50: 千叶吊兰\n物品51: 羊齿叶\n物品52: 薄荷\n物品53: 紫苏叶\n物品54: 斑斓叶\n物品55: 莲白\n物品56: 羽衣甘蓝\n物品57: 红叶生菜\n物品58: 甜玉米\n物品59: 口蘑\n物品60: 水蜜桃\n物品61: 荔枝\n物品62: 仔姜\n物品63: 洋葱\n物品64: 波斯草\n物品65: 甜菊\n物品66: 粽叶\n物品67: 茴香苗\n物品68: 甜笋\n物品69: 白芹菜\n物品70: 野菜卷\n物品71: 色拉油\n物品72: 菜籽油\n物品73: 鸡精\n物品74: 味精\n物品75: 盐\n物品76: 胡椒粉\n物品77: 花椒粉\n物品78: 五香粉\n物品79: 小麦自发粉\n物品80: 木姜子油\n物品81: 金蒜酥\n物品82: 黑松露酱\n物品83: 生粉\n物品84: 红薯淀粉\n物品85: 墨鱼汁\n物品86: 红油\n物品87: 草果粉\n物品88: 白糖\n物品89: 糍粑辣椒\n物品90: 郫县豆瓣\n物品91: 黄心皮蛋\n物品92: 藤椒油\n物品93: 花椒油\n物品94: 生抽\n物品95: 陈醋\n物品96: 家乐柠檬粉\n物品97: 泰船味露\n物品98: 糊辣椒\n物品99: 贵州五香辣椒面\n物品100: 春卷皮\n物品101: 脆哨\n物品102: 豆腐圆子\n物品103: 苹果醋\n物品104: 溏心蛋\n物品105: 糟辣椒\n物品106: 大米\n物品107: 鸡蛋\n物品108: 脆哨沫\n物品109: 软哨片\n物品110: 芥末\n物品111: 香油\n物品112: 蚝油\n物品113: 干巴菌\n物品114: 干红花椒\n物品115: 干玫瑰花\n物品116: 辣鲜露\n物品117: 鸡油\n物品118: 东古酱油\n物品119: 泡野山椒\n物品120: 新一代辣椒面\n物品121: 帕玛森干酪\n物品122: 香草冰淇淋\n物品123: 碧根果碎\n物品124: 黄天鹅无菌蛋\n物品125: 乳扇\n物品126: 干香茅草\n物品127: 黄灯笼辣椒酱\n物品128: 蒜蓉辣椒酱\n物品129: 玫瑰酱\n物品130: 百香果原汁\n物品131: 蘸料辣椒\n物品132: 烧椒\n物品133: 豆腐乳\n物品134: 水豆豉\n物品135: 猪油\n物品136: 酸汤底料\n物品137: 干冰\n物品138: 花生碎\n物品139: 脆三丁\n物品140: 木姜子\n物品141: 吊龙\n物品142: 匙仁\n物品143: 胸口油\n物品144: 五花腱\n物品145: M9和牛\n物品146: 和牛肉糜\n物品147: 去骨鸡腿肉\n物品148: 猪蹄\n物品149: 鸡爪\n物品150: 雪花松板肉\n物品151: 猪响皮\n物品152: 糯米午餐肉\n物品153: 猪肉沫\n物品154: 宣威火腿\n物品155: 肥牛肉\n物品156: 带皮牛肉\n物品157: 其它猪肉\n物品158: 基围虾\n物品159: 乌鱼片\n物品160: 虾滑\n物品161: 10头鲍\n物品162: 小管\n物品163: 生蚝\n物品164: 罗非鱼\n物品165: 花胶\n物品166: 雪花纯生\n物品167: 老雪花\n物品168: 雪花匠心\n物品169: 科罗娜\n物品170: 教士黑\n物品171: 习酒1988\n物品172: 郎歪\n物品173: 良师益友\n物品174: 南非战象\n物品175: 圣谕混酿\n物品176: 旷野之花\n物品177: 雷司令\n物品178: LV卢迦纳\n物品179: 可乐\n物品180: 雪碧\n物品181: 加多宝\n物品182: LOOK酸奶\n物品183: 百岁山\n物品184: 墨红玫瑰\n物品185: 折耳根酥\n物品186: 小番茄\n物品187: 软糖\n物品188: 果葡糖浆\n物品189: 五指毛桃\n物品190: 五指毛桃茶\n物品191: 薏仁罐头\n物品192: 山茶乌龙\n物品193: 刺梨原浆\n物品194: 刺梨果\n物品195: 鸭屎香茶\n物品196: 香水柠檬\n物品197: 黄柠檬\n物品198: 打包盒（小）\n物品199: 打包盒（大）\n物品200: 打包袋（小号）\n物品201: 打包袋（大号）\n物品202: 酒精灯\n物品203: 擦手纸\n物品204: 厕用卫生纸\n物品205: 卫生巾\n物品206: 牙线\n物品207: 口罩\n物品208: 丁晴手套\n物品209: 一次性手套\n物品210: 漱口水\n物品211: 吸管（细）\n物品212: 吸管（粗）\n物品213: 一次性围裙\n物品214: 热敏打印纸\n物品215: 排队机打印纸\n物品216: 客用卫生纸\n物品217: 毛巾\n物品218: 无痕毛巾\n物品219: 地板清洁剂\n物品220: 次氯酸\n物品221: 洗手液\n物品222: 衣服清新剂\n物品223: 花露水\n物品224: 菜品卡-大地飞雪\n物品225: 菜品卡-五花趾\n物品226: 菜品卡-匙仁\n物品227: 菜品卡-木姜子牛肉\n物品228: 菜品卡-雪花吊龙\n物品229: 菜品卡-半边云\n物品230: 垃圾袋（大号）\n物品231: 垃圾袋（小号）\n物品232: 洗洁精\n物品233: 橡胶手套\n物品234: 双头燃气灶\n物品235: 电磁炉\n物品236: 单头汤炉\n物品237: 制冰机-后厨\n物品238: 洗碗机\n物品239: 热水器\n物品240: 蒸饭柜\n物品241: 玻璃冷藏展示柜\n物品242: 冷藏工作台\n物品243: 冷冻工作台\n物品244: 双温立式冰柜\n物品245: 雪柜（仓库）\n物品246: 炒锅-小\n物品247: 炒锅-大\n物品248: 炒勺\n物品249: 平底锅\n物品250: 切刀\n物品251: 砍刀\n物品252: 水果刀\n物品253: 菜墩\n物品254: 肉墩\n物品255: 其它菜板\n物品256: 手作粗陶元宝碗（糟辣椒炒饭）\n物品257: 日式陶瓷味碟（苗侗空气丸子蘸料碗）\n物品258: 不规则方锥形小碗（水晶滑肉）\n物品259: 不规则方形小碗（另外一种）\n物品260: 圆形单层U型碗（软哨/鲜百合）\n物品261: 格雷草帽碗（紫苏桃子）\n物品262: 铸铁锅30cm\n物品263: 铸铁锅32cm\n物品264: 反冰长嘴碗（云山雪花吊龙）\n物品265: 竹板（云山雪花吊龙）\n物品266: 干冰壶\n物品267: 9英寸长方深盘（木姜子黄牛肉）\n物品268: 13英寸长方盘（糊辣椒黄牛匙仁）\n物品269: 加号长方和牛木盒（大地飞雪）\n物品270: 12英寸高尔夫长方盘（乌鱼片）\n物品271: 8英寸雷灵汤盘（干巴菌炒饭）\n物品272: 10英寸随意木碗（黑金虾滑）\n物品273: 10英寸双耳陶艺碗（海鲜拼盘）\n物品274: 12cm圆筒水草蓝（鲜板栗）\n物品275: 16cm圆筒水草蓝\n物品276: 中号椭圆橡木碗（血皮菜）\n物品277: 小号椭圆橡木碗（藕片）\n物品278: 椭圆水草蓝（菌菇组合）\n物品279: 长方形海棠玻璃托盘（丝娃娃）\n物品280: 日式创意陶泥色8.5螺纹（鲜虾）\n物品281: 双耳锤点锅（铜锅油焖鸡）\n物品282: 平底双耳锅20cm（冰淇淋雪顶玉米粑）\n物品283: 椭圆盘-黄（手撕罗非鱼）\n物品284: 小吃勺（冰淇淋雪顶玉米粑）\n物品285: 锅底汤勺\n物品286: 锅底漏勺\n物品287: 苗侗空气丸子小勺\n物品288: 复古花碗（糖）\n物品289: 花朵碗（炸折耳根）\n物品290: 饮品杯\n物品291: 筷筒玻璃杯\n物品292: 醒酒器\n物品293: 红酒杯\n物品294: 香槟杯\n物品295: 分酒器\n物品296: 白酒杯\n物品297: 酒精灯底座\n物品298: 大肚杯（茶水杯）\n物品299: 客用碗\n物品300: 骨碟\n物品301: 客用勺子\n物品302: 小料台勺\n物品303: 啤酒开瓶器\n物品304: 红酒开瓶器\n物品305: 电动开瓶器\n物品306: 泡茶桶（墨红玫瑰）\n物品307: 茶水壶\n物品308: 加汤壶\n物品309: 茶壶（饮品用）\n物品310: 量杯（金属）\n物品311: 量杯（透明）\n物品312: 搅棒（饮品用）\n物品313: 捣棒（饮品用）\n物品314: 冰桶\n物品315: 传菜托盘\n物品316: 饮料托盘\n物品317: 方形调料缸（柠檬）\n物品318: 棕色玻璃瓶（摆件）\n物品319: 餐桌\n物品320: 餐椅\n物品321: 宝宝椅\n物品322: 独凳（客用）\n物品323: 独凳（吧台用）\n物品324: 等位区桌子\n物品325: 等位区椅子\n物品326: 调料台小缸\n物品327: 垃圾桶（大厅）\n物品328: 垃圾桶（吧台）\n物品329: 拖把（圆头）\n物品330: 拖把（方头）\n物品331: 拖把（窗刮）\n物品332: 扫帚（两件套）\n物品333: 清洁水车\n物品334: 水桶\n物品335: 水盆\n物品336: 刷子\n物品337: 打火机\n物品338: 餐车\n物品339: 丁烷\n物品340: 餐框\n物品341: 餐桶\n物品342: 插线板\n物品343: 响铃\n物品344: 珠宝秤\n物品345: 菜板（吧台）\n物品346: 菜刀（吧台）\n物品347: 杯刷\n物品348: 花瓶（吧台）\n物品349: 花瓶（大竖筒）\n物品350: u型锁\n物品351: 桌立\n物品352: 电吹风\n物品353: 挂式空调1.5p\n物品354: 大空调（海信）\n物品355: 大空调（长虹）\n物品356: 桌嵌电磁炉\n物品357: 风冷柜（酒水）\n物品358: 矮冷柜\n物品359: 移动空调\n物品360: 移动电源\n物品361: 收银机\n物品362: 监控系统主机\n物品363: 监控系统显示器\n物品364: 小白盒\n物品365: 打印机（客单）\n物品366: 叫号机\n物品367: 制冰机\n物品368: 开水机\n备注: 初始盘点 - 所有368个物品数量为0$$,
    '{
  "note": "初始盘点 - 所有368个物品数量为0",
  "type": "structured_text",
  "structured_data": {
    "items": [
      {
        "item_name": "鲜板栗",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "鲜百合",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "血皮菜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "鲜黄花",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "粗山药",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "干花菜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "干贡菜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "干黄花",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "姜柄瓜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "花生芽",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "黄瓜花",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "七彩土豆",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "藕",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "豌豆尖",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "黑豆腐",
        "unit": "碗",
        "quantity": 0
      },
      {
        "item_name": "牛肝菌",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "球盖菇",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "鹿茸菇",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "绣球菌",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "金耳菌",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "土豆",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "姜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "大蒜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "小米辣",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "香茅",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "蒜苗",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "螺丝椒",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "番茄",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "折耳根",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "茄子",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "柠檬",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "鲜花椒",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "香菜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "大香菜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "美人椒",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "小青柠",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "芭蕉叶",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "绿豆芽",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "黄瓜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "青笋",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "豆皮",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "海带丝",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "凉面",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "泡萝卜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "二荆条",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "黄豆芽",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "小葱",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "大葱",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "法香",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "千叶吊兰",
        "unit": "盆",
        "quantity": 0
      },
      {
        "item_name": "羊齿叶",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "薄荷",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "紫苏叶",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "斑斓叶",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "莲白",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "羽衣甘蓝",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "红叶生菜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "甜玉米",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "口蘑",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "水蜜桃",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "荔枝",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "仔姜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "洋葱",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "波斯草",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "甜菊",
        "unit": "支",
        "quantity": 0
      },
      {
        "item_name": "粽叶",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "茴香苗",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "甜笋",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "白芹菜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "野菜卷",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "色拉油",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "菜籽油",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "鸡精",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "味精",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "盐",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "胡椒粉",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "花椒粉",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "五香粉",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "小麦自发粉",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "木姜子油",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "金蒜酥",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "黑松露酱",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "生粉",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "红薯淀粉",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "墨鱼汁",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "红油",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "草果粉",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "白糖",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "糍粑辣椒",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "郫县豆瓣",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "黄心皮蛋",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "藤椒油",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "花椒油",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "生抽",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "陈醋",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "家乐柠檬粉",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "泰船味露",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "糊辣椒",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "贵州五香辣椒面",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "春卷皮",
        "unit": "包",
        "quantity": 0
      },
      {
        "item_name": "脆哨",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "豆腐圆子",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "苹果醋",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "溏心蛋",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "糟辣椒",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "大米",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "鸡蛋",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "脆哨沫",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "软哨片",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "芥末",
        "unit": "管",
        "quantity": 0
      },
      {
        "item_name": "香油",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "蚝油",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "干巴菌",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "干红花椒",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "干玫瑰花",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "辣鲜露",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "鸡油",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "东古酱油",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "泡野山椒",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "新一代辣椒面",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "帕玛森干酪",
        "unit": "包",
        "quantity": 0
      },
      {
        "item_name": "香草冰淇淋",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "碧根果碎",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "黄天鹅无菌蛋",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "乳扇",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "干香茅草",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "黄灯笼辣椒酱",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "蒜蓉辣椒酱",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "玫瑰酱",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "百香果原汁",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "蘸料辣椒",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "烧椒",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "豆腐乳",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "水豆豉",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "猪油",
        "unit": "件",
        "quantity": 0
      },
      {
        "item_name": "酸汤底料",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "干冰",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "花生碎",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "脆三丁",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "木姜子",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "吊龙",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "匙仁",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "胸口油",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "五花腱",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "M9和牛",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "和牛肉糜",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "去骨鸡腿肉",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "猪蹄",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "鸡爪",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "雪花松板肉",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "猪响皮",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "糯米午餐肉",
        "unit": "罐",
        "quantity": 0
      },
      {
        "item_name": "猪肉沫",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "宣威火腿",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "肥牛肉",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "带皮牛肉",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "其它猪肉",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "基围虾",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "乌鱼片",
        "unit": "盒",
        "quantity": 0
      },
      {
        "item_name": "虾滑",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "10头鲍",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "小管",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "生蚝",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "罗非鱼",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "花胶",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "雪花纯生",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "老雪花",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "雪花匠心",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "科罗娜",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "教士黑",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "习酒1988",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "郎歪",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "良师益友",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "南非战象",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "圣谕混酿",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "旷野之花",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "雷司令",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "LV卢迦纳",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "可乐",
        "unit": "听",
        "quantity": 0
      },
      {
        "item_name": "雪碧",
        "unit": "听",
        "quantity": 0
      },
      {
        "item_name": "加多宝",
        "unit": "听",
        "quantity": 0
      },
      {
        "item_name": "LOOK酸奶",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "百岁山",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "墨红玫瑰",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "折耳根酥",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "小番茄",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "软糖",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "果葡糖浆",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "五指毛桃",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "五指毛桃茶",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "薏仁罐头",
        "unit": "罐",
        "quantity": 0
      },
      {
        "item_name": "山茶乌龙",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "刺梨原浆",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "刺梨果",
        "unit": "罐",
        "quantity": 0
      },
      {
        "item_name": "鸭屎香茶",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "香水柠檬",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "黄柠檬",
        "unit": "斤",
        "quantity": 0
      },
      {
        "item_name": "打包盒（小）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "打包盒（大）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "打包袋（小号）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "打包袋（大号）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "酒精灯",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "擦手纸",
        "unit": "袋",
        "quantity": 0
      },
      {
        "item_name": "厕用卫生纸",
        "unit": "卷",
        "quantity": 0
      },
      {
        "item_name": "卫生巾",
        "unit": "包",
        "quantity": 0
      },
      {
        "item_name": "牙线",
        "unit": "包",
        "quantity": 0
      },
      {
        "item_name": "口罩",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "丁晴手套",
        "unit": "盒",
        "quantity": 0
      },
      {
        "item_name": "一次性手套",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "漱口水",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "吸管（细）",
        "unit": "根",
        "quantity": 0
      },
      {
        "item_name": "吸管（粗）",
        "unit": "根",
        "quantity": 0
      },
      {
        "item_name": "一次性围裙",
        "unit": "条",
        "quantity": 0
      },
      {
        "item_name": "热敏打印纸",
        "unit": "卷",
        "quantity": 0
      },
      {
        "item_name": "排队机打印纸",
        "unit": "卷",
        "quantity": 0
      },
      {
        "item_name": "客用卫生纸",
        "unit": "包",
        "quantity": 0
      },
      {
        "item_name": "毛巾",
        "unit": "条",
        "quantity": 0
      },
      {
        "item_name": "无痕毛巾",
        "unit": "条",
        "quantity": 0
      },
      {
        "item_name": "地板清洁剂",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "次氯酸",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "洗手液",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "衣服清新剂",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "花露水",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "菜品卡-大地飞雪",
        "unit": "张",
        "quantity": 0
      },
      {
        "item_name": "菜品卡-五花趾",
        "unit": "张",
        "quantity": 0
      },
      {
        "item_name": "菜品卡-匙仁",
        "unit": "张",
        "quantity": 0
      },
      {
        "item_name": "菜品卡-木姜子牛肉",
        "unit": "张",
        "quantity": 0
      },
      {
        "item_name": "菜品卡-雪花吊龙",
        "unit": "张",
        "quantity": 0
      },
      {
        "item_name": "菜品卡-半边云",
        "unit": "张",
        "quantity": 0
      },
      {
        "item_name": "垃圾袋（大号）",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "垃圾袋（小号）",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "洗洁精",
        "unit": "桶",
        "quantity": 0
      },
      {
        "item_name": "橡胶手套",
        "unit": "双",
        "quantity": 0
      },
      {
        "item_name": "双头燃气灶",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "电磁炉",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "单头汤炉",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "制冰机-后厨",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "洗碗机",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "热水器",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "蒸饭柜",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "玻璃冷藏展示柜",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "冷藏工作台",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "冷冻工作台",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "双温立式冰柜",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "雪柜（仓库）",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "炒锅-小",
        "unit": "口",
        "quantity": 0
      },
      {
        "item_name": "炒锅-大",
        "unit": "口",
        "quantity": 0
      },
      {
        "item_name": "炒勺",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "平底锅",
        "unit": "口",
        "quantity": 0
      },
      {
        "item_name": "切刀",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "砍刀",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "水果刀",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "菜墩",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "肉墩",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "其它菜板",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "手作粗陶元宝碗（糟辣椒炒饭）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "日式陶瓷味碟（苗侗空气丸子蘸料碗）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "不规则方锥形小碗（水晶滑肉）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "不规则方形小碗（另外一种）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "圆形单层U型碗（软哨/鲜百合）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "格雷草帽碗（紫苏桃子）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "铸铁锅30cm",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "铸铁锅32cm",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "反冰长嘴碗（云山雪花吊龙）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "竹板（云山雪花吊龙）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "干冰壶",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "9英寸长方深盘（木姜子黄牛肉）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "13英寸长方盘（糊辣椒黄牛匙仁）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "加号长方和牛木盒（大地飞雪）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "12英寸高尔夫长方盘（乌鱼片）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "8英寸雷灵汤盘（干巴菌炒饭）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "10英寸随意木碗（黑金虾滑）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "10英寸双耳陶艺碗（海鲜拼盘）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "12cm圆筒水草蓝（鲜板栗）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "16cm圆筒水草蓝",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "中号椭圆橡木碗（血皮菜）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "小号椭圆橡木碗（藕片）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "椭圆水草蓝（菌菇组合）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "长方形海棠玻璃托盘（丝娃娃）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "日式创意陶泥色8.5螺纹（鲜虾）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "双耳锤点锅（铜锅油焖鸡）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "平底双耳锅20cm（冰淇淋雪顶玉米粑）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "椭圆盘-黄（手撕罗非鱼）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "小吃勺（冰淇淋雪顶玉米粑）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "锅底汤勺",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "锅底漏勺",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "苗侗空气丸子小勺",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "复古花碗（糖）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "花朵碗（炸折耳根）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "饮品杯",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "筷筒玻璃杯",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "醒酒器",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "红酒杯",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "香槟杯",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "分酒器",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "白酒杯",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "酒精灯底座",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "大肚杯（茶水杯）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "客用碗",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "骨碟",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "客用勺子",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "小料台勺",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "啤酒开瓶器",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "红酒开瓶器",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "电动开瓶器",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "泡茶桶（墨红玫瑰）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "茶水壶",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "加汤壶",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "茶壶（饮品用）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "量杯（金属）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "量杯（透明）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "搅棒（饮品用）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "捣棒（饮品用）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "冰桶",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "传菜托盘",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "饮料托盘",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "方形调料缸（柠檬）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "棕色玻璃瓶（摆件）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "餐桌",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "餐椅",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "宝宝椅",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "独凳（客用）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "独凳（吧台用）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "等位区桌子",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "等位区椅子",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "调料台小缸",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "垃圾桶（大厅）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "垃圾桶（吧台）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "拖把（圆头）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "拖把（方头）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "拖把（窗刮）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "扫帚（两件套）",
        "unit": "套",
        "quantity": 0
      },
      {
        "item_name": "清洁水车",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "水桶",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "水盆",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "刷子",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "打火机",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "餐车",
        "unit": "辆",
        "quantity": 0
      },
      {
        "item_name": "丁烷",
        "unit": "瓶",
        "quantity": 0
      },
      {
        "item_name": "餐框",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "餐桶",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "插线板",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "响铃",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "珠宝秤",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "菜板（吧台）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "菜刀（吧台）",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "杯刷",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "花瓶（吧台）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "花瓶（大竖筒）",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "u型锁",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "桌立",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "电吹风",
        "unit": "把",
        "quantity": 0
      },
      {
        "item_name": "挂式空调1.5p",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "大空调（海信）",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "大空调（长虹）",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "桌嵌电磁炉",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "风冷柜（酒水）",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "矮冷柜",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "移动空调",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "移动电源",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "收银机",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "监控系统主机",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "监控系统显示器",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "小白盒",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "打印机（客单）",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "叫号机",
        "unit": "个",
        "quantity": 0
      },
      {
        "item_name": "制冰机",
        "unit": "台",
        "quantity": 0
      },
      {
        "item_name": "开水机",
        "unit": "台",
        "quantity": 0
      }
    ],
    "notes": "初始盘点 - 所有368个物品数量为0",
    "action_type": "count"
  }
}'::jsonb,
    '2025-08-31 23:59:00',
    '2025-08-31 23:59:00',
    'approved',
    NULL,
    '2025-08-31 23:59:00'
);
