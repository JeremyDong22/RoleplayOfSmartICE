/**
 * Inventory Edit Dialog Component
 * Created: 2025-08-22
 * Updated: 2025-09-12 - Fixed database insertion, added unique validation, improved UI, added category dropdowns
 * Purpose: Dialog for editing inventory items (add/edit/delete)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
  Typography,
  Alert,
  Chip,
  Grid,
  FormHelperText,
  Divider,
  Autocomplete
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Check as CheckIcon
} from '@mui/icons-material'
import { inventoryManagementService } from '../../../services/inventoryManagementService'
import { supabase } from '../../../services/supabase'
import { restaurantConfigService } from '../../../services/restaurantConfigService'

interface InventoryItem {
  id: string
  item_name: string
  quantity: number
  unit: string
  department: '前厅' | '后厨'
  category: string
  subcategory?: string
  distribution_channel?: '本地' | '网购'
  warning_quantity?: number
  specifications?: string  // 规格
  shelf_life?: number  // 保质期（天）
  total_price?: number
  isNew?: boolean
  isDeleted?: boolean
  isEditing?: boolean  // 新增：是否正在编辑
  originalData?: Partial<InventoryItem>  // 新增：原始数据备份
}

interface InventoryEditDialogProps {
  open: boolean
  onClose: () => void
  onSave: () => void
}

export const InventoryEditDialog: React.FC<InventoryEditDialogProps> = ({
  open,
  onClose,
  onSave
}) => {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null)
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [existingSubcategories, setExistingSubcategories] = useState<string[]>([])
  
  // 新物品表单状态
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    item_name: '',
    quantity: 0,  // 新物品默认数量为0
    unit: '',
    department: '前厅',
    category: '',
    subcategory: '',
    distribution_channel: '本地',
    warning_quantity: 10,
    specifications: '',
    shelf_life: undefined
    // 注意：新物品不设置 total_price，由系统自动管理
  })
  
  // 表单验证错误
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 加载库存数据
  useEffect(() => {
    if (open) {
      loadInventory()
    }
  }, [open])

  // 提取现有的类别和子类别
  useEffect(() => {
    const categories = [...new Set(items.filter(i => !i.isDeleted && i.category).map(i => i.category))]
    const subcategories = [...new Set(items.filter(i => !i.isDeleted && i.subcategory).map(i => i.subcategory!))]
    setExistingCategories(categories)
    setExistingSubcategories(subcategories)
  }, [items])

  const loadInventory = async () => {
    try {
      setLoading(true)
      setError(null)
      const inventoryItems = await inventoryManagementService.getInventoryItems()
      setItems(inventoryItems.map(item => ({ ...item, isNew: false, isDeleted: false })))
    } catch (err) {
      console.error('Error loading inventory:', err)
      setError('加载库存数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 标记删除物品
  const handleDelete = useCallback((id: string) => {
    if (confirm('确定要删除这个物品吗？')) {
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, isDeleted: true } : item
      ))
    }
  }, [])

  // 恢复删除的物品
  const handleRestore = useCallback((id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isDeleted: false } : item
    ))
  }, [])

  // 开始编辑物品
  const handleStartEdit = useCallback((item: InventoryItem) => {
    setItems(prev => prev.map(i => 
      i.id === item.id 
        ? { ...i, isEditing: true, originalData: { ...i } }
        : i
    ))
    setEditingItem({ ...item })
  }, [])

  // 取消编辑
  const handleCancelEdit = useCallback((id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id && item.originalData) {
        return { ...item.originalData, isEditing: false, originalData: undefined }
      }
      return item
    }))
    setEditingItem(null)
  }, [])

  // 保存编辑
  const handleSaveEdit = useCallback((id: string) => {
    if (!editingItem) return
    
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...editingItem, id, isEditing: false, originalData: undefined }
        : item
    ))
    setEditingItem(null)
  }, [editingItem])

  // 验证新物品表单
  const validateNewItem = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!newItem.item_name?.trim()) {
      errors.item_name = '物品名称不能为空'
    }
    
    // 检查名称是否已存在
    const isDuplicate = items.some(item => 
      !item.isDeleted && 
      item.item_name.toLowerCase() === newItem.item_name?.trim().toLowerCase()
    )
    if (isDuplicate) {
      errors.item_name = '该物品名称已存在'
    }
    
    // 新物品数量固定为0，不需要验证
    if (!newItem.unit?.trim()) {
      errors.unit = '单位不能为空'
    }
    if (!newItem.category?.trim()) {
      errors.category = '类别不能为空'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 添加新物品
  const handleAddItem = () => {
    if (!validateNewItem()) {
      return
    }

    const newItemWithId: InventoryItem = {
      id: `new-${Date.now()}`, // 临时ID
      item_name: newItem.item_name!,
      quantity: 0,  // 新物品数量固定为0
      unit: newItem.unit!,
      department: newItem.department as '前厅' | '后厨',
      category: newItem.category!,
      subcategory: newItem.subcategory,
      distribution_channel: newItem.distribution_channel as '本地' | '网购',
      warning_quantity: newItem.warning_quantity,
      specifications: newItem.specifications,
      shelf_life: newItem.shelf_life,
      total_price: 0,  // 新物品总价固定为0
      isNew: true,
      isDeleted: false
    }

    // 将新物品添加到列表顶部
    setItems(prev => [newItemWithId, ...prev])
    
    // 重置表单
    setNewItem({
      item_name: '',
      quantity: 0,
      unit: '',
      department: '前厅',
      category: '',
      subcategory: '',
      distribution_channel: '本地',
      warning_quantity: 10,
      specifications: '',
      shelf_life: undefined
    })
    setFormErrors({})
    setIsAddingNew(false)
  }

  // 保存到数据库
  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const restaurantId = await restaurantConfigService.getRestaurantId()
      
      // 分离要删除、添加和更新的项目
      const itemsToDelete = items.filter(item => item.isDeleted && !item.isNew)
      const itemsToAdd = items.filter(item => item.isNew && !item.isDeleted)
      const itemsToUpdate = items.filter(item => 
        !item.isNew && !item.isDeleted && item.originalData
      )
      
      // 执行删除操作
      if (itemsToDelete.length > 0) {
        const deleteIds = itemsToDelete.map(item => item.id)
        const { error: deleteError } = await supabase
          .from('roleplay_inventory_items')
          .delete()
          .in('id', deleteIds)
          .eq('restaurant_id', restaurantId)
        
        if (deleteError) throw deleteError
      }
      
      // 执行更新操作 - 只更新数据库表中存在的字段
      if (itemsToUpdate.length > 0) {
        for (const item of itemsToUpdate) {
          const { error: updateError } = await supabase
            .from('roleplay_inventory_items')
            .update({
              item_name: item.item_name,
              unit: item.unit,
              department: item.department,
              category: item.category,
              subcategory: item.subcategory || null,
              distribution_channel: item.distribution_channel || '本地',
              warning_quantity: item.warning_quantity || 10,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
            .eq('restaurant_id', restaurantId)
          
          if (updateError) throw updateError
        }
      }
      
      // 执行添加操作 - 只插入数据库表中存在的字段
      if (itemsToAdd.length > 0) {
        const newItems = itemsToAdd.map(item => ({
          restaurant_id: restaurantId,
          item_name: item.item_name,
          unit: item.unit,
          department: item.department,
          category: item.category,
          subcategory: item.subcategory || null,
          distribution_channel: item.distribution_channel || '本地',
          warning_quantity: item.warning_quantity || 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
        
        const { error: insertError } = await supabase
          .from('roleplay_inventory_items')
          .insert(newItems)
        
        if (insertError) throw insertError
      }
      
      // 成功后关闭对话框并刷新
      onSave()
      onClose()
    } catch (err) {
      console.error('Error saving inventory changes:', err)
      setError('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 计算单价
  const getUnitPrice = useCallback((item: InventoryItem) => {
    if (item.total_price && item.quantity > 0) {
      return (item.total_price / item.quantity).toFixed(2)
    }
    return '-'
  }, [])
  
  // 使用 useMemo 优化统计计算
  const stats = useMemo(() => ({
    total: items.filter(i => !i.isDeleted).length,
    newCount: items.filter(i => i.isNew && !i.isDeleted).length,
    deleteCount: items.filter(i => i.isDeleted).length
  }), [items])

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon />
          编辑库存
          <Box sx={{ ml: 'auto' }}>
            <Chip 
              label={`${stats.total} 个物品`} 
              color="primary" 
              size="small" 
            />
            {stats.newCount > 0 && (
              <Chip 
                label={`${stats.newCount} 个新增`} 
                color="success" 
                size="small" 
                sx={{ ml: 1 }}
              />
            )}
            {stats.deleteCount > 0 && (
              <Chip 
                label={`${stats.deleteCount} 个待删除`} 
                color="error" 
                size="small" 
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {/* 添加新物品按钮 - 始终显示 */}
        {!isAddingNew && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setIsAddingNew(true)}
              size="small"
              sx={{ textTransform: 'none' }}
            >
              添加新物品
            </Button>
          </Box>
        )}
        
        {/* 添加新物品表单 */}
        {isAddingNew && (
          <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 150 }}>物品名称 *</TableCell>
                  <TableCell sx={{ minWidth: 80 }} align="right">当前库存</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>单位 *</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>部门 *</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>类别 *</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>子类别</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>采购渠道</TableCell>
                  <TableCell sx={{ minWidth: 120 }} align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      value={newItem.item_name || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, item_name: e.target.value }))}
                      error={!!formErrors.item_name}
                      helperText={formErrors.item_name}
                      placeholder="输入名称"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (新物品默认)
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      value={newItem.unit || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                      error={!!formErrors.unit}
                      placeholder="个/瓶/包"
                      sx={{ minWidth: 70 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      fullWidth
                      value={newItem.department || '前厅'}
                      onChange={(e) => setNewItem(prev => ({ ...prev, department: e.target.value as '前厅' | '后厨' }))}
                      sx={{ minWidth: 70 }}
                    >
                      <MenuItem value="前厅">前厅</MenuItem>
                      <MenuItem value="后厨">后厨</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      freeSolo
                      options={existingCategories}
                      value={newItem.category || ''}
                      onInputChange={(event, newValue) => {
                        setNewItem(prev => ({ ...prev, category: newValue }))
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          error={!!formErrors.category}
                          placeholder="饮料/食材"
                          sx={{ minWidth: 90 }}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      freeSolo
                      options={existingSubcategories}
                      value={newItem.subcategory || ''}
                      onInputChange={(event, newValue) => {
                        setNewItem(prev => ({ ...prev, subcategory: newValue }))
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="可选"
                          sx={{ minWidth: 90 }}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      fullWidth
                      value={newItem.distribution_channel || '本地'}
                      onChange={(e) => setNewItem(prev => ({ ...prev, distribution_channel: e.target.value as '本地' | '网购' }))}
                      sx={{ minWidth: 90 }}
                    >
                      <MenuItem value="本地">本地</MenuItem>
                      <MenuItem value="网购">网购</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={handleAddItem}
                        title="添加"
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setIsAddingNew(false)
                          setNewItem({
                            item_name: '',
                            quantity: 0,
                            unit: '',
                            department: '前厅',
                            category: '',
                            subcategory: '',
                            distribution_channel: '本地'
                          })
                          setFormErrors({})
                        }}
                        title="取消"
                      >
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {/* 分隔线 */}
        {(isAddingNew || items.length > 0) && <Divider sx={{ my: 2 }} />}
        
        {/* 物品列表 */}
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>物品名称</TableCell>
                <TableCell>单位</TableCell>
                <TableCell>部门</TableCell>
                <TableCell>类别</TableCell>
                <TableCell>子类别</TableCell>
                <TableCell>采购渠道</TableCell>
                <TableCell>规格</TableCell>
                <TableCell>保质期</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.filter(item => !item.isDeleted).concat(items.filter(item => item.isDeleted)).map((item) => (
                <TableRow 
                  key={item.id}
                  sx={{ 
                    opacity: item.isDeleted ? 0.5 : 1,
                    textDecoration: item.isDeleted ? 'line-through' : 'none',
                    bgcolor: item.isNew ? 'success.light' : item.isEditing ? 'action.hover' : 'inherit'
                  }}
                >
                  <TableCell>
                    {item.isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editingItem?.item_name || ''}
                        onChange={(e) => setEditingItem(prev => prev ? {...prev, item_name: e.target.value} : null)}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.item_name}
                        {item.isNew && <Chip label="新增" size="small" color="success" />}
                        {item.isDeleted && <Chip label="待删除" size="small" color="error" />}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editingItem?.unit || ''}
                        onChange={(e) => setEditingItem(prev => prev ? {...prev, unit: e.target.value} : null)}
                        sx={{ minWidth: 60 }}
                      />
                    ) : (
                      item.unit
                    )}
                  </TableCell>
                  <TableCell>
                    {item.isEditing ? (
                      <Select
                        size="small"
                        fullWidth
                        value={editingItem?.department || '前厅'}
                        onChange={(e) => setEditingItem(prev => prev ? {...prev, department: e.target.value as '前厅' | '后厨'} : null)}
                        sx={{ minWidth: 70 }}
                      >
                        <MenuItem value="前厅">前厅</MenuItem>
                        <MenuItem value="后厨">后厨</MenuItem>
                      </Select>
                    ) : (
                      item.department
                    )}
                  </TableCell>
                  <TableCell>
                    {item.isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editingItem?.category || ''}
                        onChange={(e) => setEditingItem(prev => prev ? {...prev, category: e.target.value} : null)}
                        sx={{ minWidth: 80 }}
                      />
                    ) : (
                      item.category
                    )}
                  </TableCell>
                  <TableCell>
                    {item.isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editingItem?.subcategory || ''}
                        onChange={(e) => setEditingItem(prev => prev ? {...prev, subcategory: e.target.value} : null)}
                        sx={{ minWidth: 80 }}
                      />
                    ) : (
                      item.subcategory || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {item.isEditing ? (
                      <Select
                        size="small"
                        fullWidth
                        value={editingItem?.distribution_channel || '本地'}
                        onChange={(e) => setEditingItem(prev => prev ? {...prev, distribution_channel: e.target.value as '本地' | '网购'} : null)}
                        sx={{ minWidth: 80 }}
                      >
                        <MenuItem value="本地">本地</MenuItem>
                        <MenuItem value="网购">网购</MenuItem>
                      </Select>
                    ) : (
                      item.distribution_channel || '本地'
                    )}
                  </TableCell>
                  <TableCell>
                    {item.isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editingItem?.specifications || ''}
                        onChange={(e) => setEditingItem(prev => prev ? {...prev, specifications: e.target.value} : null)}
                        placeholder="500ml"
                        sx={{ minWidth: 80 }}
                      />
                    ) : (
                      item.specifications || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {item.isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        type="number"
                        value={editingItem?.shelf_life || ''}
                        onChange={(e) => setEditingItem(prev => prev ? {...prev, shelf_life: e.target.value ? parseInt(e.target.value) : undefined} : null)}
                        placeholder="天数"
                        sx={{ minWidth: 60 }}
                      />
                    ) : (
                      item.shelf_life ? `${item.shelf_life}天` : '-'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {item.isDeleted ? (
                      <Button 
                        size="small" 
                        onClick={() => handleRestore(item.id)}
                      >
                        恢复
                      </Button>
                    ) : item.isEditing ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleSaveEdit(item.id)}
                          title="保存"
                        >
                          <CheckIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleCancelEdit(item.id)}
                          title="取消"
                        >
                          <CancelIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleStartEdit(item)}
                          title="编辑"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDelete(item.id)}
                          title="删除"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSave} 
          disabled={loading || (items.filter(i => i.isNew || i.isDeleted || i.originalData).length === 0)}
          startIcon={<SaveIcon />}
        >
          保存更改
        </Button>
      </DialogActions>
    </Dialog>
  )
}