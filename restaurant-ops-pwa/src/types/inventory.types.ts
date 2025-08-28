/**
 * Inventory System Types
 * Created: 2025-08-22
 * Updated: 2025-08-22 - 简化版本，只保留必要的类型
 * Purpose: Type definitions for the simplified inventory management system
 */

// 基础库存物品类型（对应 roleplay_inventory 表）
export interface InventoryItem {
  id: string
  restaurant_id: string
  item_name: string
  quantity: number
  unit: string
  department: '前厅' | '后厨'
  category: string
  subcategory?: string
  total_price?: number
  warning_quantity?: number
  distribution_channel?: '本地' | '网购'
  last_updated: string
  is_ignored?: boolean  // 是否忽略补货提醒
}

// 库存快照类型（对应 roleplay_inventory_snapshots 表）
export interface InventorySnapshot {
  id: string
  item_id: string
  restaurant_id: string
  previous_quantity?: number  // 添加：盘点前的库存
  snapshot_quantity: number
  snapshot_date: string
  created_by?: string
  notes?: string
  created_at: string
}

// 库存预测类型（计算结果，不存储）
export interface InventoryPrediction {
  item_id: string
  item_name: string
  current_quantity: number
  unit: string
  department: string
  category: string
  subcategory?: string  // 添加子类别
  total_price?: number  // 总价格
  unit_price?: number   // 单价 (total_price / quantity)
  daily_consumption: number | null
  days_remaining: number | null
  need_alert: boolean
  alert_message?: string
  suggested_order_date?: string
  distribution_channel?: string
  confidence_level: number // 0-1, 基于数据点数量
  last_updated?: string // 最后更新时间，用于计算预测库存
  is_ignored?: boolean // 是否被忽略
  original_alert?: boolean // 原始预警状态（忽略前）
}

// 入库记录类型（从 task_records 提取）
export interface ReceiptRecord {
  item_name: string
  quantity: number
  receipt_date: string
}

// UI 筛选器类型
export interface InventoryFilter {
  department?: '前厅' | '后厨'
  category?: string
  stockStatus?: 'all' | 'alert' | 'normal'
  searchTerm?: string
}

// 表单数据类型
export interface InventorySnapshotFormData {
  item_id: string
  quantity: number
  notes?: string
}

// 批量盘点数据
export interface BatchSnapshotData {
  items: Array<{
    item_id: string
    item_name: string
    current_quantity: number
    new_quantity: number
    unit: string
    notes?: string
  }>
}

// 为了兼容旧代码，暂时保留这些类型别名
export type InventoryStatus = InventoryPrediction
export type InventoryAlert = {
  item_id: string
  message: string
  level: 'critical' | 'warning'
}

// 库存历史记录类型（对应 inventory_history_view 视图）
export interface InventoryHistoryRecord {
  record_id: string
  restaurant_id: string
  user_id: string
  operator_name: string
  record_date: string
  operation_time: string
  operation_type: 'receipt' | 'loss'
  operation_type_display: string
  item_name: string
  quantity: number | null
  unit_price: number | null
  total_price: number | null
  unit: string
  loss_quantity: number | null
  loss_cost: number | null
  supplier?: string | null
  invoice_no?: string | null
  notes?: string | null
  item_id?: string
  department?: '前厅' | '后厨'
  category?: string
  subcategory?: string
  current_stock?: number
  warning_quantity?: number
  stock_change: number
  value_change: number
}

// 历史记录筛选器类型
export interface InventoryHistoryFilter {
  item_name?: string
  department?: '前厅' | '后厨' | 'all'
  operation_type?: 'receipt' | 'loss' | 'all'
  date_from?: string
  date_to?: string
  group_by?: 'item' | 'none'
}

// 历史记录分组类型
export interface InventoryHistoryGroup {
  key: string // item_name or date
  display_name: string
  records: InventoryHistoryRecord[]
  total_receipts: number
  total_losses: number
  total_value_change: number
  total_stock_change: number
  latest_operation: string
}

// 暂时保留这些空类型以避免编译错误
export interface ConsumptionRate {}
export interface InventoryReceiptFormData {}
export interface ConsumptionPrediction {}
export interface VarianceAnalysis {}
export interface POSSale {}