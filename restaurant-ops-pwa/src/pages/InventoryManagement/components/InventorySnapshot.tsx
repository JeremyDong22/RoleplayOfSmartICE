/**
 * Inventory Snapshot Component
 * Created: 2025-08-22
 * Updated: 2025-08-26 - Modified to upload counting tasks to task_records
 * Purpose: Handle inventory counting and upload to task_records with unified metadata structure
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  LocalShipping as ShippingIcon,
  Store as StoreIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import { inventoryService } from '../../../services/inventoryService'
import { submitTaskWithMedia } from '../../../utils/taskSubmissionHelper'
import { authService } from '../../../services/authService'
import { restaurantConfigService } from '../../../services/restaurantConfigService'
import type { InventoryItem } from '../../../services/inventoryService'

interface InventorySnapshotProps {
  onComplete: () => void
  initialData?: any[] // 预加载的库存数据
  skipInitialLoad?: boolean // 是否跳过初始加载
}

interface EditableItem {
  item_id: string
  item_name: string
  department: string
  category: string
  subcategory?: string
  unit: string
  distribution_channel?: string
  edited_quantity: number | null
  isEditing: boolean
  hasChanged: boolean
}

const LOCALSTORAGE_KEY = 'inventory_snapshot_edits'

export const InventorySnapshot: React.FC<InventorySnapshotProps> = ({
  onComplete,
  initialData,
  skipInitialLoad = false
}) => {
  const [editableItems, setEditableItems] = useState<EditableItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [department, setDepartment] = useState<'all' | '前厅' | '后厨'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({ open: false, message: '', severity: 'info' })

  // Initialize editable items from inventory predictions
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      // 使用传入的数据
      processInventoryData(initialData)
    } else if (!skipInitialLoad) {
      // 如果没有传入数据且不跳过加载，才加载
      loadInventoryItems()
    }
  }, [skipInitialLoad, initialData])

  // Click outside to close edit - 优化性能
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 如果点击的是编辑框或触发器，不做任何处理
      if (target.closest('.edit-box') || target.closest('.edit-trigger')) {
        return
      }
      
      // 只有在有编辑中的项目时才更新状态
      setEditableItems(prev => {
        const hasEditingItem = prev.some(item => item.isEditing)
        if (!hasEditingItem) {
          return prev // 没有编辑中的项目，直接返回原状态
        }
        return prev.map(item => 
          item.isEditing ? { ...item, isEditing: false } : item
        )
      })
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const processInventoryData = (items: any[]) => {
    // Load saved edits from localStorage
    const savedEdits = localStorage.getItem(LOCALSTORAGE_KEY)
    const editsMap = savedEdits ? JSON.parse(savedEdits) : {}
    
    // Convert to editable items
    const editableData: EditableItem[] = items.map(item => ({
      item_id: item.id || item.item_id,
      item_name: item.item_name,
      department: item.department,
      category: item.category || '',
      subcategory: item.subcategory,
      unit: item.unit,
      distribution_channel: item.distribution_channel,
      edited_quantity: editsMap[item.id || item.item_id] ?? null,
      isEditing: false,
      hasChanged: editsMap[item.id || item.item_id] !== undefined
    }))
    
    setEditableItems(editableData)
    
    // Extract unique categories
    const uniqueCategories = [...new Set(items.filter(item => item.category).map(item => item.category!))].sort()
    setCategories(uniqueCategories)
  }

  const loadInventoryItems = async () => {
    try {
      setLoading(true)
      
      // Get all inventory items from roleplay_inventory_items table
      const items = await inventoryService.getAllInventory()
      processInventoryData(items)
    } catch (error) {
      console.error('Error loading inventory items:', error)
      setSnackbar({
        open: true,
        message: '加载库存物品列表失败',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  // Memoize filtered items to prevent unnecessary recalculations
  const filteredItems = useMemo(() => editableItems.filter(item => {
    if (searchTerm && !item.item_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (department !== 'all' && item.department !== department) {
      return false
    }
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false
    }
    return true
  }), [editableItems, searchTerm, department, categoryFilter])


  // Optimized quantity change handler with useCallback
  const handleQuantityChange = useCallback((itemId: string, value: string) => {
    // If value is empty, treat as null instead of 0
    const numValue = value.trim() === '' ? null : parseFloat(value)
    
    setEditableItems(prev => {
      // 找到目标项目
      const targetIndex = prev.findIndex(item => item.item_id === itemId)
      if (targetIndex === -1) return prev
      
      // 创建新数组，只更新目标项目
      const newItems = [...prev]
      const targetItem = prev[targetIndex]
      
      newItems[targetIndex] = {
        ...targetItem,
        edited_quantity: numValue,
        hasChanged: numValue !== null  // 只有输入了实际值才标记为已更改
      }
      
      // 保存到 localStorage
      const savedEdits = localStorage.getItem(LOCALSTORAGE_KEY)
      const editsMap = savedEdits ? JSON.parse(savedEdits) : {}
      
      if (numValue !== null) {
        editsMap[itemId] = numValue
      } else {
        delete editsMap[itemId]  // 如果是null，从保存的编辑中删除
      }
      
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(editsMap))
      
      return newItems
    })
  }, [])

  // Optimized edit toggle handler
  const handleEditToggle = useCallback((itemId: string, isEditing: boolean) => {
    setEditableItems(prev => prev.map(item => 
      item.item_id === itemId 
        ? { ...item, isEditing }
        : { ...item, isEditing: false } // Close other edits
    ))
  }, [])


  // Clear all edits
  const handleClearEdits = () => {
    localStorage.removeItem(LOCALSTORAGE_KEY)
    setEditableItems(prev => prev.map(item => ({
      ...item,
      edited_quantity: null,
      hasChanged: false,
      isEditing: false
    })))
    setSnackbar({
      open: true,
      message: '已清除所有编辑',
      severity: 'info'
    })
  }

  // Upload counting task to task_records
  const handleUploadChanges = async () => {
    try {
      setUploading(true)
      
      // Get items with changes (items that have edited_quantity)
      const countedItems = editableItems.filter(item => 
        item.edited_quantity !== null && item.edited_quantity >= 0
      )
      
      if (countedItems.length === 0) {
        setSnackbar({
          open: true,
          message: '请至少输入一个物品的盘点数量',
          severity: 'info'
        })
        return
      }
      
      // Get current user and restaurant info
      const currentUser = authService.getCurrentUser()
      const restaurantId = await restaurantConfigService.getRestaurantId()
      
      if (!currentUser || !restaurantId) {
        setSnackbar({
          open: true,
          message: '用户信息或餐厅信息获取失败',
          severity: 'error'
        })
        return
      }
      
      // Prepare counting task data with unified metadata structure
      const taskData = {
        taskId: 'inventory-count-task-bc61c086-6b59-431c-8ae8-cc4b1e0fb9f0', // 库存盘点任务ID
        userId: currentUser.id,
        restaurantId,
        date: new Date().toISOString().split('T')[0],
        periodId: null, // 盘点任务不属于特定时段
        data: {
          type: 'structured_text',
          structured_data: {
            action_type: 'count',
            items: countedItems.map(item => ({
              item_name: item.item_name,
              quantity: item.edited_quantity,
              unit: item.unit
            })),
            notes: `库存盘点 - ${new Date().toLocaleDateString('zh-CN')}`
          },
          note: `盘点${countedItems.length}个物品`
        }
      }
      
      // Submit counting task
      await submitTaskWithMedia(taskData)
      
      // Clear localStorage
      localStorage.removeItem(LOCALSTORAGE_KEY)
      
      setSnackbar({
        open: true,
        message: `成功上传${countedItems.length}个物品的盘点数据`,
        severity: 'success'
      })
      
      // Refresh data
      onComplete()
      loadInventoryItems()
      
    } catch (error) {
      console.error('Error uploading counting task:', error)
      setSnackbar({
        open: true,
        message: '上传盘点任务失败，请重试',
        severity: 'error'
      })
    } finally {
      setUploading(false)
    }
  }


  // Count changed items
  const changedItemsCount = editableItems.filter(item => item.hasChanged).length

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header with Upload Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">库存盘点</Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {changedItemsCount > 0 && (
            <>
              <Chip 
                label={`${changedItemsCount} 项已修改`} 
                color="warning" 
                size="small"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearEdits}
                startIcon={<RefreshIcon />}
              >
                清除编辑
              </Button>
            </>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
            onClick={handleUploadChanges}
            disabled={uploading || changedItemsCount === 0}
          >
            上传最新数据
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
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
          sx={{ flexGrow: 1, maxWidth: 300 }}
        />
        
        <ToggleButtonGroup
          value={department}
          exclusive
          onChange={(e, val) => val && setDepartment(val)}
          size="small"
        >
          <ToggleButton value="all">全部</ToggleButton>
          <ToggleButton value="前厅">
            <StoreIcon sx={{ mr: 0.5 }} fontSize="small" />
            前厅
          </ToggleButton>
          <ToggleButton value="后厨">
            <ShippingIcon sx={{ mr: 0.5 }} fontSize="small" />
            后厨
          </ToggleButton>
        </ToggleButtonGroup>
        
        {/* Category Filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>类别筛选</InputLabel>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            label="类别筛选"
            startAdornment={<FilterIcon fontSize="small" sx={{ ml: 1, mr: 0.5 }} />}
          >
            <MenuItem value="all">全部类别</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 2 }}>
        点击盘点数量栏进行输入，编辑内容会自动保存在本地，完成所有盘点后点击"上传最新数据"提交盘点任务
      </Alert>

      {/* Inventory Table */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          overflowX: 'auto',
          '& .MuiTable-root': {
            minWidth: 650 // Ensures table has minimum width for proper column spacing
          }
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 150 }}>物品名称</TableCell>
              <TableCell sx={{ minWidth: 80 }}>部门</TableCell>
              <TableCell sx={{ minWidth: 100 }}>类别</TableCell>
              <TableCell sx={{ minWidth: 120 }}>采购渠道</TableCell>
              <TableCell sx={{ minWidth: 130 }}>盘点数量</TableCell>
              <TableCell sx={{ minWidth: 70 }}>单位</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow 
                key={item.item_id}
                sx={{ 
                  '&:hover': { bgcolor: 'action.hover' },
                  bgcolor: item.hasChanged ? 'warning.lighter' : 'inherit'
                }}
              >
                <TableCell>{item.item_name}</TableCell>
                <TableCell>{item.department}</TableCell>
                <TableCell>{item.category || '-'}</TableCell>
                <TableCell>
                  {item.distribution_channel ? (
                    <Chip 
                      label={item.distribution_channel} 
                      size="small" 
                      variant="outlined"
                    />
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {item.isEditing ? (
                    <TextField
                      className="edit-box"
                      size="small"
                      type="number"
                      defaultValue={item.edited_quantity ?? ''}
                      placeholder="输入数量"
                      onBlur={(e) => {
                        handleQuantityChange(item.item_id, e.target.value)
                        handleEditToggle(item.item_id, false)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement
                          handleQuantityChange(item.item_id, target.value)
                          handleEditToggle(item.item_id, false)
                        } else if (e.key === 'Escape') {
                          handleEditToggle(item.item_id, false)
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      sx={{ width: 100 }}
                      inputProps={{ 
                        min: 0, 
                        step: 0.1
                      }}
                    />
                  ) : (
                    <Button
                      className="edit-trigger"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditToggle(item.item_id, true)
                      }}
                      startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                      sx={{ 
                        textTransform: 'none',
                        fontWeight: item.hasChanged ? 'bold' : 'normal',
                        color: item.edited_quantity !== null ? 'primary.main' : 'text.secondary'
                      }}
                    >
                      {item.edited_quantity !== null ? item.edited_quantity : '点击输入'}
                    </Button>
                  )}
                </TableCell>
                <TableCell>{item.unit}</TableCell>
              </TableRow>
            ))}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    暂无库存数据
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}