/**
 * Inventory History Types
 * Created: 2025-01-24
 * Purpose: Re-export inventory history types to fix import issues
 */

// 库存历史记录类型（对应 inventory_history_view 视图）
export type InventoryHistoryRecord = {
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
export type InventoryHistoryFilter = {
  item_name?: string
  department?: '前厅' | '后厨'
  operation_type?: 'receipt' | 'loss' | 'all'
  date_from?: string
  date_to?: string
  group_by?: 'item' | 'date' | 'none'
}

// 历史记录分组类型
export type InventoryHistoryGroup = {
  key: string // item_name or date
  display_name: string
  records: InventoryHistoryRecord[]
  total_receipts: number
  total_losses: number
  total_value_change: number
  total_stock_change: number
  latest_operation: string
}