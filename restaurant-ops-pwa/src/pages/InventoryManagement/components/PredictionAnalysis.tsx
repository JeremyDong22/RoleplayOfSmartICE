/**
 * Prediction Analysis Component
 * Created: 2025-08-22
 * Updated: 2025-08-31 - 重命名为PredictionAnalysis，专注于预测和预警功能
 * Purpose: Display inventory predictions, consumption analysis and alerts
 */

import React, { useState, useMemo } from 'react'
import {
  Box,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  LinearProgress,
  Alert,
  Button,
  useMediaQuery,
  useTheme
} from '@mui/material'
import {
  Search as SearchIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  TrendingDown as TrendingDownIcon,
  LocalShipping as ShippingIcon,
  Store as StoreIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  UnfoldMore as SortIcon,
  VisibilityOff as IgnoreIcon
} from '@mui/icons-material'
import type { InventoryPrediction } from '../../../types/inventory.types'
import { inventoryManagementService } from '../../../services/inventoryManagementService'

interface PredictionAnalysisProps {
  inventoryPredictions: InventoryPrediction[]
  alertItems: InventoryPrediction[]
  onRefresh: () => void
}

export const PredictionAnalysis: React.FC<PredictionAnalysisProps> = ({
  inventoryPredictions,
  alertItems,
  onRefresh
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  
  const [searchTerm, setSearchTerm] = useState('')
  const [department, setDepartment] = useState<'all' | '前厅' | '后厨'>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'alert' | 'normal'>('all')
  const [sortBy, setSortBy] = useState<'none' | 'quantity' | 'consumption' | 'days' | 'category' | 'subcategory'>('none')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    let items = inventoryPredictions.filter(item => {
      // Search filter
      if (searchTerm && !item.item_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      
      // Department filter
      if (department !== 'all' && item.department !== department) {
        return false
      }
      
      // Stock status filter
      if (stockFilter === 'alert' && !item.need_alert) {
        return false
      }
      if (stockFilter === 'normal' && item.need_alert) {
        return false
      }
      
      return true
    })
    
    // Apply sorting
    if (sortBy !== 'none') {
      items = [...items].sort((a, b) => {
        let compareValue = 0
        
        switch (sortBy) {
          case 'quantity':
            compareValue = (a.current_quantity || 0) - (b.current_quantity || 0)
            break
          case 'consumption':
            compareValue = (a.daily_consumption || 0) - (b.daily_consumption || 0)
            break
          case 'days':
            compareValue = (a.days_remaining ?? 999) - (b.days_remaining ?? 999)
            break
          case 'category':
            compareValue = a.category.localeCompare(b.category)
            break
          case 'subcategory':
            compareValue = (a.subcategory || '').localeCompare(b.subcategory || '')
            break
        }
        
        return sortOrder === 'asc' ? compareValue : -compareValue
      })
    }
    
    return items
  }, [inventoryPredictions, searchTerm, department, stockFilter, sortBy, sortOrder])

  const handleSort = (column: 'quantity' | 'consumption' | 'days' | 'category' | 'subcategory') => {
    if (sortBy === column) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else {
        setSortBy('none')
        setSortOrder('asc')
      }
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }
  
  const getSortIcon = (column: 'quantity' | 'consumption' | 'days' | 'category' | 'subcategory') => {
    if (sortBy !== column) {
      return <SortIcon fontSize="small" sx={{ ml: 0.5, opacity: 0.3, cursor: 'pointer' }} />
    }
    return sortOrder === 'asc' 
      ? <ArrowUpIcon fontSize="small" sx={{ ml: 0.5, cursor: 'pointer' }} />
      : <ArrowDownIcon fontSize="small" sx={{ ml: 0.5, cursor: 'pointer' }} />
  }

  const handleIgnoreAlert = async (itemId: string) => {
    try {
      await inventoryManagementService.ignoreItem(itemId)
      onRefresh() // 刷新数据
    } catch (error) {
      console.error('Failed to ignore item:', error)
    }
  }

  const getStockStatusChip = (needAlert: boolean) => {
    if (needAlert) {
      return <Chip label="需补货" size="small" color="error" icon={<ErrorIcon />} />
    }
    return <Chip label="正常" size="small" color="success" icon={<CheckIcon />} />
  }

  const getDaysRemainingColor = (days: number | null) => {
    if (days === null) return 'text.secondary'
    if (days <= 1) return 'error.main'
    if (days <= 3) return 'warning.main'
    return 'success.main'
  }

  const getConsumptionDisplay = (rate: number | null) => {
    if (!rate) return <Typography variant="caption" color="text.secondary">-</Typography>
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <TrendingDownIcon fontSize="small" color="action" />
        <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>{rate.toFixed(1)}/天</Typography>
      </Box>
    )
  }

  const getDistributionIcon = (channel?: string) => {
    if (channel === '网购') {
      return <ShippingIcon fontSize="small" color="action" />
    }
    return <StoreIcon fontSize="small" color="action" />
  }

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        gap: 2, 
        flexWrap: 'wrap', 
        alignItems: 'center'
      }}>
        <TextField
          size="small"
          placeholder="搜索物品..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 200 }}
        />
        
        <ToggleButtonGroup
          size="small"
          value={department}
          exclusive
          onChange={(e, value) => value && setDepartment(value)}
        >
          <ToggleButton value="all">全部</ToggleButton>
          <ToggleButton value="前厅">前厅</ToggleButton>
          <ToggleButton value="后厨">后厨</ToggleButton>
        </ToggleButtonGroup>
        
        <ToggleButtonGroup
          size="small"
          value={stockFilter}
          exclusive
          onChange={(e, value) => value && setStockFilter(value)}
        >
          <ToggleButton value="all">全部状态</ToggleButton>
          <ToggleButton value="alert" color="error">
            需补货
          </ToggleButton>
          <ToggleButton value="normal" color="success">
            正常
          </ToggleButton>
        </ToggleButtonGroup>
        
        <Box sx={{ ml: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography 
            variant="body2" 
            color="text.secondary"
          >
            共 {filteredItems.length} 项
          </Typography>
        </Box>
      </Box>

      {/* Active Alerts Summary */}
      {alertItems.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" gutterBottom>
            补货提醒 ({alertItems.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {alertItems.slice(0, 3).map(alert => (
              <Alert 
                key={alert.item_id}
                severity="error"
                action={
                  <Button 
                    size="small" 
                    color="inherit"
                    startIcon={<IgnoreIcon />}
                    onClick={() => handleIgnoreAlert(alert.item_id)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    忽略
                  </Button>
                }
              >
                {alert.alert_message}
                {alert.suggested_order_date && (
                  <Typography variant="caption" display="block">
                    建议订货日期：{alert.suggested_order_date}
                  </Typography>
                )}
              </Alert>
            ))}
          </Box>
        </Paper>
      )}

      {/* Inventory Table */}
      <TableContainer component={Paper} sx={{ overflowX: 'auto', maxWidth: '100%' }}>
        <Table size="small" sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              {/* 核心库存列 */}
              <TableCell sx={{ 
                minWidth: 150, 
                whiteSpace: 'nowrap'
              }}>
                物品名称
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleSort('quantity')}>
                  当前库存
                  {getSortIcon('quantity')}
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleSort('consumption')}>
                  日均消耗
                  {getSortIcon('consumption')}
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleSort('days')}>
                  剩余天数
                  {getSortIcon('days')}
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ 
                minWidth: 100,
                whiteSpace: 'nowrap'
              }}>
                预警状态
              </TableCell>
              
              {/* 物品属性列 */}
              <TableCell sx={{ minWidth: 80, whiteSpace: 'nowrap' }}>单位</TableCell>
              <TableCell sx={{ minWidth: 100, whiteSpace: 'nowrap' }}>部门</TableCell>
              <TableCell sx={{ minWidth: 100, whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('category')}>
                  类别
                  {getSortIcon('category')}
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 100, whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('subcategory')}>
                  子类别
                  {getSortIcon('subcategory')}
                </Box>
              </TableCell>
              
              {/* 补充信息列 */}
              <TableCell align="center" sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>采购渠道</TableCell>
              <TableCell align="center" sx={{ minWidth: 100, whiteSpace: 'nowrap' }}>警戒库存</TableCell>
              <TableCell align="center" sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>最后盘点</TableCell>
              <TableCell align="center" sx={{ minWidth: 130, whiteSpace: 'nowrap' }}>数据可信度</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow 
                key={item.item_id}
                sx={{ 
                  '&:hover': { bgcolor: 'action.hover' },
                  opacity: item.need_alert ? 0.95 : 1,
                  bgcolor: item.need_alert ? 'error.light' : 'inherit'
                }}
              >
                {/* 核心库存列 */}
                <TableCell sx={{ 
                  whiteSpace: 'nowrap'
                }}>
                  <Typography variant="body2">{item.item_name}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap', fontWeight: item.current_quantity === 0 ? 'bold' : 'normal', color: item.current_quantity === 0 ? 'error.main' : 'text.primary' }}>
                    {item.current_quantity !== null && item.current_quantity !== undefined ? item.current_quantity : '-'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {getConsumptionDisplay(item.daily_consumption)}
                </TableCell>
                <TableCell align="center">
                  {item.days_remaining !== null ? (
                    <Typography 
                      variant="body2" 
                      color={getDaysRemainingColor(item.days_remaining)}
                      fontWeight={item.days_remaining <= 1 ? 'bold' : 'normal'}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {item.days_remaining.toFixed(1)} 天
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      无数据
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  {getStockStatusChip(item.need_alert)}
                </TableCell>
                
                {/* 物品属性列 */}
                <TableCell>
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    {item.unit}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {item.department}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>{item.category}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {item.subcategory || '-'}
                  </Typography>
                </TableCell>
                
                {/* 补充信息列 */}
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    {getDistributionIcon(item.distribution_channel)}
                    <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                      {item.distribution_channel || '本地'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {item.warning_quantity || '-'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {item.last_updated ? new Date(item.last_updated).toLocaleDateString('zh-CN') : '-'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {item.confidence_level > 0 ? (
                    <Box sx={{ width: 60, mx: 'auto' }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={item.confidence_level * 100} 
                        sx={{ height: 4, borderRadius: 2 }}
                        color={item.confidence_level > 0.6 ? 'success' : 'warning'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(item.confidence_level * 100)}%
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      需更多数据
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {filteredItems.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            没有找到符合条件的库存项目
          </Typography>
        </Box>
      )}
    </Box>
  )
}