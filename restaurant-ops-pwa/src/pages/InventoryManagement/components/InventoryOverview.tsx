/**
 * Inventory Overview Component
 * Created: 2025-08-31
 * Updated: 2025-08-31 - 新建库存概览组件，只显示实际盘点数据
 * Purpose: Display actual inventory count data without predictions
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
  Typography,
  Button,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material'
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Store as StoreIcon,
  LocalShipping as ShippingIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  UnfoldMore as SortIcon
} from '@mui/icons-material'
import { InventoryEditDialog } from './InventoryEditDialog'
import { inventoryRealtimeService } from '../../../services/inventoryRealtimeService'
import type { InventoryRealtimeItem } from '../../../services/inventoryRealtimeService'

interface InventoryOverviewProps {
  inventoryItems?: InventoryRealtimeItem[]
  onRefresh: () => void
}

export const InventoryOverview: React.FC<InventoryOverviewProps> = ({ inventoryItems, onRefresh }) => {
  const [loading, setLoading] = useState(!inventoryItems || inventoryItems.length === 0)
  const [items, setItems] = useState<InventoryRealtimeItem[]>(inventoryItems || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [department, setDepartment] = useState<'all' | '前厅' | '后厨'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'none' | 'name' | 'quantity' | 'category' | 'subcategory' | 'date'>('none')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Use provided data or load on mount
  React.useEffect(() => {
    if (inventoryItems && inventoryItems.length > 0) {
      setItems(inventoryItems)
      setLoading(false)
    } else if (!inventoryItems) {
      loadInventoryData()
    }
  }, [inventoryItems])

  const loadInventoryData = async () => {
    try {
      setLoading(true)
      const data = await inventoryRealtimeService.getRealtimeInventory()
      setItems(data)
    } catch (error) {
      console.error('Failed to load inventory data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(items.map(item => item.category))]
    return uniqueCategories.sort()
  }, [items])

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      // Search filter
      if (searchTerm && !item.item_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      
      // Department filter
      if (department !== 'all' && item.department !== department) {
        return false
      }
      
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false
      }
      
      return true
    })
    
    // Apply sorting
    if (sortBy !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        let compareValue = 0
        
        switch (sortBy) {
          case 'name':
            compareValue = a.item_name.localeCompare(b.item_name)
            break
          case 'quantity':
            compareValue = (a.last_count_quantity || 0) - (b.last_count_quantity || 0)
            break
          case 'category':
            compareValue = a.category.localeCompare(b.category)
            break
          case 'subcategory':
            compareValue = (a.subcategory || '').localeCompare(b.subcategory || '')
            break
          case 'date':
            compareValue = (a.last_count_date || '').localeCompare(b.last_count_date || '')
            break
        }
        
        return sortOrder === 'asc' ? compareValue : -compareValue
      })
    }
    
    return filtered
  }, [items, searchTerm, department, selectedCategory, sortBy, sortOrder])

  const handleSort = (column: 'name' | 'quantity' | 'category' | 'subcategory' | 'date') => {
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
  
  const getSortIcon = (column: 'name' | 'quantity' | 'category' | 'subcategory' | 'date') => {
    if (sortBy !== column) {
      return <SortIcon fontSize="small" sx={{ ml: 0.5, opacity: 0.3, cursor: 'pointer' }} />
    }
    return sortOrder === 'asc' 
      ? <ArrowUpIcon fontSize="small" sx={{ ml: 0.5, cursor: 'pointer' }} />
      : <ArrowDownIcon fontSize="small" sx={{ ml: 0.5, cursor: 'pointer' }} />
  }

  const getDistributionIcon = (channel?: string | null) => {
    if (channel === '网购') {
      return <ShippingIcon fontSize="small" color="action" />
    }
    return <StoreIcon fontSize="small" color="action" />
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  // Show loading state if data is loading
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
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
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>类别</InputLabel>
          <Select
            value={selectedCategory}
            label="类别"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="all">全部类别</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Box sx={{ ml: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography 
            variant="body2" 
            color="text.secondary"
          >
            共 {filteredItems.length} 项
          </Typography>
          <Button
            variant="text"
            size="small"
            startIcon={<EditIcon sx={{ fontSize: 18 }} />}
            onClick={() => setEditDialogOpen(true)}
            sx={{ 
              textTransform: 'none',
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            编辑
          </Button>
        </Box>
      </Box>

      {/* Inventory Table */}
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 150 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                  物品名称
                  {getSortIcon('name')}
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 120 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleSort('quantity')}>
                  上次盘点库存
                  {getSortIcon('quantity')}
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 80 }}>单位</TableCell>
              <TableCell sx={{ minWidth: 100 }}>部门</TableCell>
              <TableCell sx={{ minWidth: 100 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('category')}>
                  类别
                  {getSortIcon('category')}
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 100 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('subcategory')}>
                  子类别
                  {getSortIcon('subcategory')}
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 120 }}>采购渠道</TableCell>
              <TableCell sx={{ minWidth: 120 }}>规格</TableCell>
              <TableCell align="center" sx={{ minWidth: 100 }}>保质期</TableCell>
              <TableCell align="center" sx={{ minWidth: 120 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleSort('date')}>
                  最后盘点
                  {getSortIcon('date')}
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow 
                key={item.id}
                sx={{ 
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <TableCell>
                  <Typography variant="body2">{item.item_name}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: item.last_count_quantity === 0 ? 'bold' : 'normal',
                      color: item.last_count_quantity === 0 ? 'error.main' : 'text.primary'
                    }}
                  >
                    {item.last_count_quantity !== null && item.last_count_quantity !== undefined ? item.last_count_quantity : '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{item.unit}</Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.department} 
                    size="small" 
                    variant="outlined"
                    color={item.department === '后厨' ? 'warning' : 'info'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{item.category}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {item.subcategory || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getDistributionIcon(item.distribution_channel)}
                    <Typography variant="caption">
                      {item.distribution_channel || '本地'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {item.specifications || '-'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="caption" color="text.secondary">
                    {item.shelf_life ? `${item.shelf_life}天` : '-'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(item.last_count_date)}
                  </Typography>
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
      
      {/* 编辑对话框 */}
      <InventoryEditDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={() => {
          setEditDialogOpen(false)
          loadInventoryData() // 刷新数据
          onRefresh()
        }}
      />
    </Box>
  )
}