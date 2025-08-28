/**
 * New Variance Report Component with flexible time range selection
 * Created: 2025-08-24
 * Updated: 2025-08-25 - Changed default date range to month start to today, removed quick date presets
 * Purpose: Display and manage variance reports with custom time periods
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  IconButton,
  TextField,
  Skeleton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material'
import {
  Assessment,
  CalendarToday,
  Download,
  Refresh,
  ExpandMore,
  ExpandLess,
  Info,
  CheckCircle,
  Warning,
  AttachMoney,
  Inventory,
  LocalShipping,
  TrendingUp,
  TrendingDown,
  Description,
  CloudDownload,
  TableChart,
  PictureAsPdf
} from '@mui/icons-material'
import { 
  varianceReportService, 
  type SavedReport, 
  type VarianceReport 
} from '../../../services/varianceReportService'
import { format, startOfMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { exportToExcel, exportToPDF } from '../../../utils/exportUtils'
import { ReportDetailsContent } from './ReportDetailsContent'

// 报告列表项组件
const ReportListItem: React.FC<{ 
  report: SavedReport, 
  onView: () => void,
  onExport: (format: 'excel' | 'pdf') => void 
}> = ({ report, onView, onExport }) => {
  const [expanded, setExpanded] = useState(false)
  
  const formatCurrency = (value: number) => `¥${value.toFixed(2)}`
  
  // 计算周环比（如果有上一个报告的话）
  const weekOverWeekChange = 0 // TODO: 实现周环比计算
  
  return (
    <Card sx={{ mb: 2, '&:hover': { boxShadow: 3 } }}>
      <CardContent sx={{ pb: expanded ? 2 : 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            {/* 标题行 */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarToday sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {format(new Date(report.created_at), 'yyyy-MM-dd HH:mm')}
              </Typography>
              <Chip 
                label={report.report_type === 'auto' ? '自动生成' : '手动生成'} 
                size="small" 
                sx={{ ml: 1 }}
                color={report.report_type === 'auto' ? 'success' : 'primary'}
                variant="outlined"
              />
            </Box>
            
            {/* 摘要信息 */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                📅 {format(new Date(report.period_start), 'MM/dd')} - {format(new Date(report.period_end), 'MM/dd')} ({report.period_days}天)
              </Typography>
              <Typography variant="body2">
                📦 {report.item_count}个物品
              </Typography>
              <Typography variant="body2" color="error.main" sx={{ fontWeight: 500 }}>
                💰 消耗{formatCurrency(report.total_consumption_cost)}
              </Typography>
              {weekOverWeekChange !== 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {weekOverWeekChange > 0 ? (
                    <TrendingUp sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                  )}
                  <Typography 
                    variant="body2" 
                    color={weekOverWeekChange > 0 ? 'error.main' : 'success.main'}
                  >
                    {Math.abs(weekOverWeekChange)}%
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* 展开的详细信息 */}
            <Collapse in={expanded}>
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">日均消耗</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatCurrency(report.avg_daily_consumption_cost)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">进货次数</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {report.total_receipts_count}次
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">进货价值</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatCurrency(report.total_receipts_value)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">库存价值</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatCurrency(report.total_current_value)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Box>
          
          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>
      </CardContent>
      
      <CardActions sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
        <Button size="small" startIcon={<Assessment />} onClick={onView}>
          查看详情
        </Button>
        <Button size="small" startIcon={<TableChart />} onClick={() => onExport('excel')}>
          导出Excel
        </Button>
        <Button size="small" startIcon={<PictureAsPdf />} onClick={() => onExport('pdf')}>
          导出PDF
        </Button>
      </CardActions>
    </Card>
  )
}

// 空状态组件
const EmptyState: React.FC = () => (
  <Box sx={{ textAlign: 'center', py: 8 }}>
    <Assessment sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
    <Typography variant="h6" color="text.secondary" gutterBottom>
      暂无差异报告
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      选择时间段生成报告，或完成库存盘点后自动生成
    </Typography>
  </Box>
)

// 主组件
export const VarianceReportNew: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [loadingReports, setLoadingReports] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reports, setReports] = useState<SavedReport[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [newItemsCount, setNewItemsCount] = useState(0)
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date | null>(new Date())
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  
  // 加载报告列表
  const loadReports = async (append = false) => {
    try {
      setLoadingReports(true)
      const offset = append ? reports.length : 0
      const result = await varianceReportService.getReportList(10, offset)
      
      if (append) {
        setReports([...reports, ...result.reports])
      } else {
        setReports(result.reports)
      }
      setHasMore(result.hasMore)
    } catch (error) {
      console.error('加载报告列表失败:', error)
    } finally {
      setLoadingReports(false)
    }
  }
  
  // 检查新盘点数据
  const checkNewSnapshots = async () => {
    try {
      const itemIds = await varianceReportService.getItemsWithNewSnapshots()
      setNewItemsCount(itemIds.length)
    } catch (error) {
      console.error('检查新盘点数据失败:', error)
    }
  }
  
  useEffect(() => {
    loadReports()
    checkNewSnapshots()
  }, [])
  
  
  // 生成新报告
  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      alert('请选择开始和结束日期')
      return
    }
    
    if (startDate >= endDate) {
      alert('开始日期必须早于结束日期')
      return
    }
    
    try {
      setGenerating(true)
      const report = await varianceReportService.generateReportForPeriod(startDate, endDate, 'manual')
      
      // 将新报告添加到列表顶部
      setReports([report, ...reports])
      setNewItemsCount(0)
      
      // 自动打开查看
      setSelectedReport(report)
      setDetailDialogOpen(true)
    } catch (error) {
      console.error('生成报告失败:', error)
      alert('生成报告失败，请稍后重试')
    } finally {
      setGenerating(false)
    }
  }
  
  // 查看报告详情
  const handleViewReport = async (report: SavedReport) => {
    setSelectedReport(report)
    setDetailDialogOpen(true)
  }
  
  // 导出报告
  const handleExportReport = async (report: SavedReport, format: 'excel' | 'pdf') => {
    try {
      // 先获取完整的报告数据（如果当前报告数据不完整）
      let fullReport = report
      if (!report.report_data || !report.report_data.items) {
        const fetchedReport = await varianceReportService.getReportById(report.id)
        if (fetchedReport) {
          fullReport = fetchedReport
        }
      }
      
      // 执行导出
      let success = false
      if (format === 'excel') {
        success = exportToExcel(fullReport)
      } else if (format === 'pdf') {
        success = exportToPDF(fullReport)
      }
      
      // 更新导出状态
      if (success) {
        await varianceReportService.markReportExported(report.id, format)
      }
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请稍后重试')
    }
  }
  
  return (
    <Box>
      {/* 页面标题 */}
      <Typography variant="h6" gutterBottom>
        库存差异报告
      </Typography>
      
      {/* 新盘点提醒 */}
      {newItemsCount > 0 && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => checkNewSnapshots()}>
              刷新
            </Button>
          }
        >
          <AlertTitle>有新的盘点数据</AlertTitle>
          {newItemsCount}个物品完成了新的盘点，可以生成新的差异报告
        </Alert>
      )}
      
      {/* 自定义报告生成区域 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          自定义报告生成
        </Typography>
        
        {/* 日期选择器 */}
        <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              label="开始日期"
              type="date"
              value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              label="结束日期"
              type="date"
              value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={generating ? <CircularProgress size={20} /> : <Assessment />}
              onClick={handleGenerateReport}
              disabled={generating || !startDate || !endDate}
            >
              生成报告
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* 历史报告列表 */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            历史报告列表
          </Typography>
          <IconButton size="small" onClick={() => loadReports()}>
            <Refresh />
          </IconButton>
        </Box>
        
        {loadingReports && reports.length === 0 ? (
          // 加载骨架屏
          <Box>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 1 }} />
            ))}
          </Box>
        ) : reports.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {reports.map(report => (
              <ReportListItem
                key={report.id}
                report={report}
                onView={() => handleViewReport(report)}
                onExport={(format) => handleExportReport(report, format)}
              />
            ))}
            
            {hasMore && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => loadReports(true)}
                  disabled={loadingReports}
                >
                  {loadingReports ? '加载中...' : '加载更多'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
      
      {/* 报告详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          报告详情 - {selectedReport && format(new Date(selectedReport.created_at), 'yyyy-MM-dd HH:mm')}
        </DialogTitle>
        <DialogContent>
          {selectedReport ? (
            <ReportDetailsContent 
              report={selectedReport}
              onExport={(format) => handleExportReport(selectedReport, format)}
            />
          ) : (
            <Typography>加载中...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}