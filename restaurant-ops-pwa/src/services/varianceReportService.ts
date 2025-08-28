/**
 * Variance Report Service
 * Created: 2025-01-24
 * Updated: 2025-08-26 - Disconnected from database, using placeholder data
 * Purpose: 生成库存差异报告，分析两次盘点之间的变化
 */

// Temporarily disconnected from database
// import { supabase } from './supabase'
// import { restaurantConfigService } from './restaurantConfigService'
// import { fifoService } from './fifoService'
// import { authService } from './authService'

export interface VarianceReportItem {
  item_id: string
  item_name: string
  department: string
  category: string
  unit: string
  
  // 库存数量
  previous_quantity: number      // 上次盘点库存
  current_quantity: number       // 本次盘点库存
  receipts_quantity: number      // 期间收货总量
  consumption_quantity: number   // 消耗量（上次+收货-本次）
  
  // 价值计算
  consumption_cost: number       // 消耗成本（FIFO）
  current_value: number         // 当前库存价值
  unit_price: number            // 当前单价
  
  // 进货信息
  receipt_count: number         // 进货次数
  receipt_details: Array<{
    date: string
    quantity: number
    unit_price: number
    total_price: number
  }>
  
  // 分析指标
  daily_consumption: number     // 日均消耗
  days_between_counts: number   // 盘点间隔天数
  variance_percentage: number   // 差异百分比
}

export interface SavedReport {
  id: string
  restaurant_id: string
  report_type: 'manual' | 'auto'
  period_start: string
  period_end: string
  period_days: number
  trigger_type: 'snapshot' | 'manual' | 'scheduled'
  item_count: number
  total_consumption_quantity: number
  total_consumption_cost: number
  avg_daily_consumption_cost: number
  total_receipts_value: number
  total_receipts_count: number
  total_current_value: number
  report_data: any
  created_at: string
  created_by: string
  notes?: string
  exported_at?: string
  export_format?: string
}

export interface VarianceReport {
  period_start: Date
  period_end: Date
  days_between: number
  items: VarianceReportItem[]
  summary: {
    total_items: number
    total_consumption_cost: number
    total_receipts_value: number
    total_current_value: number
    avg_daily_consumption: number
  }
}

class VarianceReportService {
  /**
   * 生成差异报告（占位符数据）
   */
  async generateReport(startDate: Date, endDate: Date): Promise<VarianceReport> {
    // Placeholder data
    const mockItems: VarianceReportItem[] = [
      {
        item_id: '1',
        item_name: '示例物品1',
        department: '前厅',
        category: '餐具',
        unit: '个',
        previous_quantity: 100,
        current_quantity: 80,
        receipts_quantity: 50,
        consumption_quantity: 70,
        consumption_cost: 350,
        current_value: 400,
        unit_price: 5,
        receipt_count: 2,
        receipt_details: [
          {
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            quantity: 30,
            unit_price: 5,
            total_price: 150
          },
          {
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            quantity: 20,
            unit_price: 5,
            total_price: 100
          }
        ],
        daily_consumption: 10,
        days_between_counts: 7,
        variance_percentage: -20
      },
      {
        item_id: '2',
        item_name: '示例物品2',
        department: '后厨',
        category: '食材',
        unit: 'kg',
        previous_quantity: 50,
        current_quantity: 45,
        receipts_quantity: 30,
        consumption_quantity: 35,
        consumption_cost: 700,
        current_value: 900,
        unit_price: 20,
        receipt_count: 1,
        receipt_details: [
          {
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            quantity: 30,
            unit_price: 20,
            total_price: 600
          }
        ],
        daily_consumption: 5,
        days_between_counts: 7,
        variance_percentage: -10
      }
    ]

    const daysBetween = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      period_start: startDate,
      period_end: endDate,
      days_between: daysBetween,
      items: mockItems,
      summary: {
        total_items: mockItems.length,
        total_consumption_cost: 1050,
        total_receipts_value: 850,
        total_current_value: 1300,
        avg_daily_consumption: 150
      }
    }
  }

  /**
   * 获取最近的盘点日期（占位符）
   */
  async getSnapshotDates(): Promise<Array<{ date: string; count: number }>> {
    // Return mock dates
    return [
      { date: new Date().toISOString(), count: 10 },
      { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), count: 8 },
      { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), count: 12 }
    ]
  }

  /**
   * 保存报告（占位符）
   */
  async saveReport(report: VarianceReport, type: 'manual' | 'auto' = 'manual'): Promise<string> {
    console.log('[Placeholder] Saving report:', type)
    return `report-${Date.now()}`
  }

  /**
   * 获取保存的报告列表（占位符）
   */
  async getSavedReports(limit = 10): Promise<SavedReport[]> {
    // Return empty array as placeholder
    return []
  }

  /**
   * 获取报告详情（占位符）
   */
  async getReportById(reportId: string): Promise<SavedReport | null> {
    console.log('[Placeholder] Getting report:', reportId)
    return null
  }

  /**
   * 导出报告（占位符）
   */
  async exportReport(reportId: string, format: 'excel' | 'pdf' = 'excel'): Promise<Blob> {
    console.log('[Placeholder] Exporting report:', reportId, format)
    return new Blob(['Placeholder report data'], { type: 'text/plain' })
  }

  /**
   * 为指定时间段生成报告（占位符）
   */
  async generateReportForPeriod(startDate: Date, endDate: Date, triggerType: 'manual' | 'auto' = 'manual'): Promise<string> {
    const report = await this.generateReport(startDate, endDate)
    return await this.saveReport(report, triggerType === 'auto' ? 'auto' : 'manual')
  }
}

export const varianceReportService = new VarianceReportService()