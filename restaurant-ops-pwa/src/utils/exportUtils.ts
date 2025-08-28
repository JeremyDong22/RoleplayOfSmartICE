/**
 * Export utilities for variance reports
 * Created: 2025-08-24
 * Purpose: Handle Excel and PDF export functionality
 */

import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { SavedReport, VarianceReportItem } from '../services/varianceReportService'

/**
 * Export report to Excel format
 */
export const exportToExcel = (report: SavedReport) => {
  try {
    const workbook = XLSX.utils.book_new()
    
    // Sheet 1: 报告概要
    const summaryData = [
      ['库存差异报告', ''],
      ['', ''],
      ['报告ID', report.id],
      ['生成时间', format(new Date(report.created_at), 'yyyy-MM-dd HH:mm:ss')],
      ['报告类型', report.report_type === 'auto' ? '自动生成' : '手动生成'],
      ['', ''],
      ['报告期间', ''],
      ['开始日期', format(new Date(report.period_start), 'yyyy-MM-dd', { locale: zhCN })],
      ['结束日期', format(new Date(report.period_end), 'yyyy-MM-dd', { locale: zhCN })],
      ['统计天数', `${report.period_days}天`],
      ['', ''],
      ['汇总数据', ''],
      ['物品数量', report.item_count],
      ['总消耗成本', `¥${report.total_consumption_cost.toFixed(2)}`],
      ['日均消耗成本', `¥${report.avg_daily_consumption_cost.toFixed(2)}`],
      ['进货总价值', `¥${report.total_receipts_value.toFixed(2)}`],
      ['进货次数', report.total_receipts_count],
      ['当前库存价值', `¥${report.total_current_value.toFixed(2)}`],
    ]
    
    // Sheet 2: 详细数据
    const items = report.report_data?.items || []
    const detailData = items.map((item: VarianceReportItem) => ({
      '物品名称': item.item_name,
      '部门': item.department || '-',
      '类别': item.category || '-',
      '单位': item.unit,
      '期初库存': item.previous_quantity,
      '期末库存': item.current_quantity,
      '收货数量': item.receipts_quantity,
      '消耗数量': item.consumption_quantity,
      '消耗成本(¥)': item.consumption_cost.toFixed(2),
      '当前价值(¥)': item.current_value.toFixed(2),
      '单价(¥)': item.unit_price.toFixed(2),
      '日均消耗': item.daily_consumption.toFixed(2),
      '进货次数': item.receipt_count,
      '差异百分比(%)': item.variance_percentage ? item.variance_percentage.toFixed(1) : '0.0'
    }))
    
    // Sheet 3: 进货明细（如果有）
    const receiptDetails: any[] = []
    items.forEach((item: VarianceReportItem) => {
      if (item.receipt_details && item.receipt_details.length > 0) {
        item.receipt_details.forEach(receipt => {
          receiptDetails.push({
            '物品名称': item.item_name,
            '进货日期': format(new Date(receipt.date), 'yyyy-MM-dd HH:mm'),
            '数量': receipt.quantity,
            '单价(¥)': receipt.unit_price.toFixed(2),
            '总价(¥)': receipt.total_price.toFixed(2)
          })
        })
      }
    })
    
    // 创建工作表
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    const ws2 = XLSX.utils.json_to_sheet(detailData)
    
    // 设置列宽
    ws1['!cols'] = [{ wch: 20 }, { wch: 40 }]
    ws2['!cols'] = [
      { wch: 20 }, // 物品名称
      { wch: 10 }, // 部门
      { wch: 10 }, // 类别
      { wch: 8 },  // 单位
      { wch: 10 }, // 期初库存
      { wch: 10 }, // 期末库存
      { wch: 10 }, // 收货数量
      { wch: 10 }, // 消耗数量
      { wch: 12 }, // 消耗成本
      { wch: 12 }, // 当前价值
      { wch: 10 }, // 单价
      { wch: 10 }, // 日均消耗
      { wch: 10 }, // 进货次数
      { wch: 12 }  // 差异百分比
    ]
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, ws1, '报告概要')
    XLSX.utils.book_append_sheet(workbook, ws2, '详细数据')
    
    // 如果有进货明细，添加第三个工作表
    if (receiptDetails.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(receiptDetails)
      ws3['!cols'] = [
        { wch: 20 }, // 物品名称
        { wch: 20 }, // 进货日期
        { wch: 10 }, // 数量
        { wch: 10 }, // 单价
        { wch: 12 }  // 总价
      ]
      XLSX.utils.book_append_sheet(workbook, ws3, '进货明细')
    }
    
    // 生成文件名
    const fileName = `库存差异报告_${format(new Date(report.period_start), 'yyyyMMdd')}-${format(new Date(report.period_end), 'yyyyMMdd')}_${format(new Date(), 'yyyyMMddHHmmss')}.xlsx`
    
    // 下载文件
    XLSX.writeFile(workbook, fileName)
    
    return true
  } catch (error) {
    console.error('导出Excel失败:', error)
    throw error
  }
}

/**
 * Export report to PDF format
 * Note: This is a placeholder. Actual PDF generation would require a library like jsPDF
 */
export const exportToPDF = (report: SavedReport) => {
  // TODO: Implement PDF export using jsPDF or similar library
  console.log('PDF export not yet implemented', report)
  alert('PDF导出功能正在开发中...')
  return false
}

/**
 * Export report to CSV format (simple data only)
 */
export const exportToCSV = (report: SavedReport) => {
  try {
    const items = report.report_data?.items || []
    
    // Create CSV content
    const headers = [
      '物品名称',
      '部门',
      '类别',
      '单位',
      '期初库存',
      '期末库存',
      '消耗数量',
      '消耗成本',
      '日均消耗'
    ]
    
    const rows = items.map((item: VarianceReportItem) => [
      item.item_name,
      item.department || '-',
      item.category || '-',
      item.unit,
      item.previous_quantity,
      item.current_quantity,
      item.consumption_quantity,
      item.consumption_cost.toFixed(2),
      item.daily_consumption.toFixed(2)
    ])
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const fileName = `库存差异报告_${format(new Date(), 'yyyyMMddHHmmss')}.csv`
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    return true
  } catch (error) {
    console.error('导出CSV失败:', error)
    throw error
  }
}