/**
 * InventoryItemPicker 组件类型定义
 * Created: 2025-08-21
 * Purpose: 为库存物品选择器组件提供类型支持
 */

export interface InventoryItem {
  id: string
  restaurant_id?: string
  item_name: string
  quantity: number
  unit: string
  department: string
  category?: string
  subcategory?: string
  warning_quantity?: number
  total_price?: number
  last_updated?: string
  created_at?: string
}

export interface InventoryItemPickerProps {
  // 核心属性
  value: string | null                    // 当前选中的物品名称
  onChange: (itemName: string | null) => void  // 选择变更回调
  department: '前厅' | '后厨'            // 部门筛选
  
  // UI属性
  label?: string                         // 标签文本（默认："物品名称"）
  required?: boolean                     // 是否必填
  error?: boolean                       // 错误状态
  helperText?: string                   // 帮助文本/错误信息
  disabled?: boolean                    // 禁用状态
  placeholder?: string                  // 占位符文本
  fullWidth?: boolean                   // 是否占满宽度
  
  // 高级功能
  onItemSelect?: (item: InventoryItem) => void  // 选择物品时的完整回调（包含单位等信息）
  excludeItems?: string[]               // 排除的物品列表
  customFilter?: (option: string, inputValue: string) => boolean  // 自定义过滤函数
  showQuantity?: boolean                // 是否显示库存数量
  showUnit?: boolean                    // 是否显示单位
  allowCustom?: boolean                 // 是否允许输入自定义物品
  loading?: boolean                     // 外部控制的加载状态
}

export interface InventoryItemOption {
  label: string
  value: string
  item: InventoryItem
}