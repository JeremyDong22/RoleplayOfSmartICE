/**
 * Variance Report Component
 * Created: 2025-08-22
 * Updated: 2025-01-24 - 实现完整的差异报告功能
 * Purpose: Display variance analysis between inventory counts
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Collapse,
  Grid,
  Badge,
  Alert,
  CircularProgress,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText
} from '@mui/material'
import {
  TrendingDown,
  TrendingUp,
  LocalShipping,
  Inventory,
  Assessment,
  ExpandMore,
  ExpandLess,
  Info,
  CheckCircle,
  Warning,
  Receipt as ReceiptIcon,
  AttachMoney,
  CalendarToday,
  ShoppingCart
} from '@mui/icons-material'
import { varianceReportService, type VarianceReport, type VarianceReportItem } from '../../../services/varianceReportService'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { VarianceCharts } from './VarianceCharts'

export const VarianceReport: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<VarianceReport | null>(null)
  const [newItemsCount, setNewItemsCount] = useState(0)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<VarianceReportItem | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  useEffect(() => {
    checkNewSnapshots()
  }, [])

  // 检查是否有新的盘点数据
  const checkNewSnapshots = async () => {
    try {
      const itemIds = await varianceReportService.getItemsWithNewSnapshots()
      setNewItemsCount(itemIds.length)
    } catch (error) {
      console.error('Error checking new snapshots:', error)
    }
  }

  // 生成差异报告
  const generateReport = async () => {
    console.log('[UI] 开始生成差异报告...')
    setLoading(true)
    try {
      const reportData = await varianceReportService.generateVarianceReport()
      console.log('[UI] 报告数据:', reportData)
      setReport(reportData)
      setNewItemsCount(0) // 清除提醒
    } catch (error) {
      console.error('[UI] 生成报告失败:', error)
      // 显示错误提示
      alert('生成报告失败：' + (error as any)?.message || '未知错误')
    } finally {
      setLoading(false)
      console.log('[UI] 报告生成流程结束')
    }
  }

  // 展开/收起物品详情
  const toggleItemExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  // 显示物品详情对话框
  const showItemDetail = (item: VarianceReportItem) => {
    setSelectedItem(item)
    setDetailDialogOpen(true)
  }

  // 获取状态颜色
  const getStatusColor = (value: number) => {
    if (value > 0) return 'success'
    if (value < 0) return 'error'
    return 'default'
  }

  // 格式化货币
  const formatCurrency = (value: number) => {
    return `¥${value.toFixed(2)}`
  }

  if (!report && !loading && newItemsCount === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>差异报告</Typography>
        <Alert severity="info">
          暂无新的盘点数据。完成库存盘点后，这里将显示差异分析报告。
        </Alert>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* 标题栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">差异报告</Typography>
        {newItemsCount > 0 && !report && (
          <Badge badgeContent={newItemsCount} color="error">
            <Button
              variant="contained"
              color="primary"
              startIcon={<Assessment />}
              onClick={generateReport}
            >
              查看新报告
            </Button>
          </Badge>
        )}
        {report && (
          <Button
            variant="outlined"
            startIcon={<CheckCircle />}
            onClick={() => setReport(null)}
          >
            清除报告
          </Button>
        )}
      </Box>

      {report && (
        <>
          {/* 报告概要卡片 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      报告周期
                    </Typography>
                  </Box>
                  <Typography variant="h6">
                    {report.period.days} 天
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(report.period.from, 'MM/dd', { locale: zhCN })} - 
                    {format(report.period.to, 'MM/dd', { locale: zhCN })}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AttachMoney sx={{ mr: 1, color: 'error.main' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      消耗成本
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="error.main">
                    {formatCurrency(report.summary.total_consumption_cost)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    日均: {formatCurrency(report.summary.avg_daily_consumption_cost)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocalShipping sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      进货价值
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(report.summary.total_receipts_value)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {report.items.reduce((sum, item) => sum + item.receipt_count, 0)} 次进货
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Inventory sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      库存价值
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary.main">
                    {formatCurrency(report.summary.total_current_value)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {report.summary.total_items} 个物品
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 可视化图表 */}
          {report.items.length > 0 && (
            <VarianceCharts items={report.items} />
          )}

          {/* 物品差异明细表 */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="20%">物品名称</TableCell>
                  <TableCell align="center">部门/类别</TableCell>
                  <TableCell align="center">上次盘点</TableCell>
                  <TableCell align="center">期间进货</TableCell>
                  <TableCell align="center">本次盘点</TableCell>
                  <TableCell align="center">消耗量</TableCell>
                  <TableCell align="center">消耗成本</TableCell>
                  <TableCell align="center">日均消耗</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.items.map((item) => (
                  <React.Fragment key={item.item_id}>
                    <TableRow hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.item_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={item.department} size="small" sx={{ mr: 0.5 }} />
                        <Chip label={item.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        {item.previous_quantity} {item.unit}
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2">
                            {item.receipts_quantity} {item.unit}
                          </Typography>
                          {item.receipt_count > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {item.receipt_count} 次
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {item.current_quantity} {item.unit}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.consumption_quantity > 0 ? (
                            <TrendingDown color="error" fontSize="small" sx={{ mr: 0.5 }} />
                          ) : (
                            <TrendingUp color="success" fontSize="small" sx={{ mr: 0.5 }} />
                          )}
                          <Typography 
                            variant="body2" 
                            color={item.consumption_quantity > 0 ? 'error' : 'success'}
                          >
                            {item.consumption_quantity} {item.unit}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="error">
                          {formatCurrency(item.consumption_cost)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {item.daily_consumption.toFixed(1)} {item.unit}/天
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="查看进货明细">
                          <IconButton size="small" onClick={() => toggleItemExpand(item.item_id)}>
                            {expandedItems.has(item.item_id) ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="查看详情">
                          <IconButton size="small" onClick={() => showItemDetail(item)}>
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    
                    {/* 展开的进货明细 */}
                    <TableRow>
                      <TableCell colSpan={9} sx={{ py: 0 }}>
                        <Collapse in={expandedItems.has(item.item_id)} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              进货明细
                            </Typography>
                            {item.receipt_details.length > 0 ? (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>进货日期</TableCell>
                                    <TableCell align="right">数量</TableCell>
                                    <TableCell align="right">单价</TableCell>
                                    <TableCell align="right">总价</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {item.receipt_details.map((receipt, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>
                                        {format(new Date(receipt.date), 'MM/dd HH:mm', { locale: zhCN })}
                                      </TableCell>
                                      <TableCell align="right">
                                        {receipt.quantity} {item.unit}
                                      </TableCell>
                                      <TableCell align="right">
                                        {formatCurrency(receipt.unit_price)}
                                      </TableCell>
                                      <TableCell align="right">
                                        {formatCurrency(receipt.total_price)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                期间无进货记录
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 详情对话框 */}
          <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
            {selectedItem && (
              <>
                <DialogTitle>
                  {selectedItem.item_name} - 差异分析详情
                </DialogTitle>
                <DialogContent dividers>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="盘点间隔"
                        secondary={`${selectedItem.days_between_counts} 天`}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="库存变化"
                        secondary={`${selectedItem.previous_quantity} → ${selectedItem.current_quantity} ${selectedItem.unit}`}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="消耗分析"
                        secondary={
                          <>
                            总消耗: {selectedItem.consumption_quantity} {selectedItem.unit}<br />
                            日均消耗: {selectedItem.daily_consumption.toFixed(2)} {selectedItem.unit}/天<br />
                            消耗成本: {formatCurrency(selectedItem.consumption_cost)} (FIFO计算)
                          </>
                        }
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="当前库存价值"
                        secondary={
                          <>
                            总价值: {formatCurrency(selectedItem.current_value)}<br />
                            单价: {formatCurrency(selectedItem.unit_price)}/{selectedItem.unit}
                          </>
                        }
                      />
                    </ListItem>
                    {selectedItem.variance_percentage !== 0 && (
                      <>
                        <Divider />
                        <ListItem>
                          <ListItemText
                            primary="差异分析"
                            secondary={
                              <Chip 
                                label={`${selectedItem.variance_percentage > 0 ? '+' : ''}${selectedItem.variance_percentage.toFixed(1)}%`}
                                color={Math.abs(selectedItem.variance_percentage) > 10 ? 'warning' : 'default'}
                                size="small"
                              />
                            }
                          />
                        </ListItem>
                      </>
                    )}
                  </List>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
                </DialogActions>
              </>
            )}
          </Dialog>
        </>
      )}
    </Box>
  )
}