/**
 * Inventory History Panel Component
 * Created: 2025-01-24
 * Updated: 2025-08-26 - Display all fields from roleplay_inventory_records_view
 * Purpose: Display inventory movement history in a table format
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Card,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Autocomplete,
  Button
} from '@mui/material'
import {
  Receipt as ReceiptIcon,
  TrendingDown as LossIcon,
  FilterList as FilterIcon,
  Inventory as InventoryIcon,
  CalendarToday as CalendarIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { format, parseISO, startOfDay, endOfDay, startOfMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  inventoryHistoryService,
  type InventoryHistoryRecord,
  type InventoryHistoryFilter
} from '../../services/inventoryHistoryService'

// Helper functions
const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  return `¥${value.toFixed(2)}`
}

const formatQuantity = (value: number | null, unit?: string | null) => {
  if (value === null || value === undefined) return '-'
  return unit ? `${value} ${unit}` : `${value}`
}

const formatDateTime = (date: string) => {
  if (!date) return '-'
  return format(parseISO(date), 'MM-dd HH:mm', { locale: zhCN })
}

interface InventoryHistoryPanelProps {
  restaurantId: string
  defaultItemName?: string
  onClose?: () => void
}

export const InventoryHistoryPanel: React.FC<InventoryHistoryPanelProps> = ({
  restaurantId,
  defaultItemName,
  onClose
}) => {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<InventoryHistoryRecord[]>([])
  const [uniqueItems, setUniqueItems] = useState<string[]>([])
  
  // Initialize with current month range
  const now = new Date()
  const monthStart = startOfMonth(now)
  const todayEnd = endOfDay(now)
  
  // Filter states
  const [filter, setFilter] = useState<InventoryHistoryFilter>({
    item_name: defaultItemName || '',
    operation_type: 'all',
    department: 'all',
    date_from: format(monthStart, "yyyy-MM-dd'T'HH:mm:ss"),
    date_to: format(todayEnd, "yyyy-MM-dd'T'HH:mm:ss"),
    restaurant_id: restaurantId
  })

  // Load data
  useEffect(() => {
    if (restaurantId) {
      loadHistory()
      loadUniqueItems()
    }
  }, [restaurantId, filter])

  const loadHistory = async () => {
    console.log('[InventoryHistoryPanel] Loading history with filter:', filter)
    setLoading(true)
    try {
      const data = await inventoryHistoryService.getHistoryRecords(filter)
      console.log('[InventoryHistoryPanel] Received', data.length, 'records')
      setRecords(data)
    } catch (error) {
      console.error('[InventoryHistoryPanel] Failed to load history:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUniqueItems = async () => {
    try {
      const items = await inventoryHistoryService.getUniqueItems(restaurantId)
      setUniqueItems(items)
    } catch (error) {
      console.error('[InventoryHistoryPanel] Failed to load items:', error)
    }
  }

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalIn = records.filter(r => r.movement_type === '入库').length
    const totalOut = records.filter(r => r.movement_type === '出库').length
    const totalValueIn = records.reduce((sum, r) => sum + (r.value_in || r.total_price || 0), 0)
    const totalValueOut = records.reduce((sum, r) => sum + (r.value_out || 0), 0)
    
    return { totalIn, totalOut, totalValueIn, totalValueOut }
  }, [records])

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      '时间', '任务名称', '操作员', '部门', '物品名称', 
      '数量', '单位', '单价', '总价', '质量检查', '备注'
    ]
    
    const rows = records.map(r => [
      formatDateTime(r.created_at),
      r.task_name || '',
      r.user_name || '',
      r.user_department || '',
      r.item_name || '',
      r.quantity || r.quantity_in || r.quantity_out || '',
      r.unit || '',
      r.unit_price || '',
      r.total_price || r.value_in || r.value_out || '',
      r.quality_check || '',
      r.notes || ''
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `库存历史_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    link.click()
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            库存历史记录
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={loadHistory}
              variant="outlined"
              size="small"
            >
              刷新
            </Button>
            <Button 
              startIcon={<DownloadIcon />} 
              onClick={exportToCSV}
              variant="outlined"
              size="small"
              disabled={records.length === 0}
            >
              导出
            </Button>
          </Stack>
        </Stack>
        
        
        {/* Filters */}
        <Grid container spacing={2} alignItems="center">
          <Grid size={4}>
            <Autocomplete
              value={filter.item_name || null}
              onChange={(_, newValue) => setFilter(prev => ({ ...prev, item_name: newValue || '' }))}
              options={uniqueItems}
              renderInput={(params) => (
                <TextField {...params} label="物品" size="small" placeholder="全部物品" />
              )}
              freeSolo
              fullWidth
            />
          </Grid>
          
          <Grid size={3}>
            <ToggleButtonGroup
              value={filter.department || 'all'}
              exclusive
              onChange={(_, value) => value && setFilter(prev => ({ ...prev, department: value as '前厅' | '后厨' | 'all' }))}
              size="small"
              fullWidth
            >
              <ToggleButton value="all">全部</ToggleButton>
              <ToggleButton value="前厅">前厅</ToggleButton>
              <ToggleButton value="后厨">后厨</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          
          <Grid size={5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                type="date"
                size="small"
                label="开始日期"
                value={filter.date_from ? format(parseISO(filter.date_from), 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? startOfDay(new Date(e.target.value)) : null
                  setFilter(prev => ({ 
                    ...prev, 
                    date_from: date ? format(date, "yyyy-MM-dd'T'HH:mm:ss") : ''
                  }))
                }}
                InputLabelProps={{ shrink: true }}
              />
              <Typography variant="body2">至</Typography>
              <TextField
                type="date"
                size="small"
                label="结束日期"
                value={filter.date_to ? format(parseISO(filter.date_to), 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? endOfDay(new Date(e.target.value)) : null
                  setFilter(prev => ({ 
                    ...prev, 
                    date_to: date ? format(date, "yyyy-MM-dd'T'HH:mm:ss") : ''
                  }))
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      
      {/* History Table */}
      <Paper sx={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : records.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            暂无历史记录
          </Alert>
        ) : (
          <TableContainer sx={{ height: '100%' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>任务名称</TableCell>
                  <TableCell>操作员</TableCell>
                  <TableCell>部门</TableCell>
                  <TableCell>物品名称</TableCell>
                  <TableCell align="right">数量</TableCell>
                  <TableCell>单位</TableCell>
                  <TableCell align="right">单价</TableCell>
                  <TableCell align="right">总价</TableCell>
                  <TableCell>质量检查</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>备注</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record, index) => {
                  const isIn = record.movement_type === '入库'
                  const quantity = record.quantity || record.quantity_in || record.quantity_out
                  const value = record.total_price || record.value_in || record.value_out
                  
                  return (
                    <TableRow 
                      key={`${record.record_id}-${index}`}
                      sx={{ 
                        backgroundColor: isIn ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)',
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <TableCell>{formatDateTime(record.created_at)}</TableCell>
                      <TableCell>{record.task_name || '-'}</TableCell>
                      <TableCell>{record.user_name || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={record.user_department || '-'} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {record.item_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {quantity ? formatQuantity(quantity) : '-'}
                      </TableCell>
                      <TableCell>{record.unit || '-'}</TableCell>
                      <TableCell align="right">{formatCurrency(record.unit_price)}</TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          color={isIn ? 'success.main' : 'error.main'}
                          fontWeight="medium"
                        >
                          {formatCurrency(value)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {record.quality_check && (
                          <Chip 
                            label={record.quality_check} 
                            size="small"
                            color={record.quality_check === '合格' ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={record.movement_type || record.action_type || '-'} 
                          size="small"
                          color={isIn ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{record.notes || record.loss_reason || '-'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}