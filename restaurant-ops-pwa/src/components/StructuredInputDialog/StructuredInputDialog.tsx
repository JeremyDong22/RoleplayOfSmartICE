/**
 * 结构化输入对话框
 * Created: 2025-08-11
 * Purpose: 处理需要结构化数据输入的任务（如收货验货、损耗盘点）
 * 支持动态加载库存列表和自动填充单位
 * Updated: 2025-08-12 - 移除损耗盘点的价格计算和质量检查，更新损耗原因选项
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
  InputAdornment,
  Chip
} from '@mui/material'
import {
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  AttachMoney as MoneyIcon,
  PhotoCamera as PhotoCameraIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material'
import { inventoryService } from '../../services/inventoryService'
import { authService } from '../../services/authService'
import { restaurantConfigService } from '../../services/restaurantConfigService'

interface StructuredInputDialogProps {
  open: boolean
  taskName: string
  taskId: string
  structuredFields?: any
  isFloatingTask?: boolean
  requiresPhoto?: boolean  // 新增：是否需要拍照
  onClose: () => void
  onSubmit: (data: any) => void
}

export const StructuredInputDialog: React.FC<StructuredInputDialogProps> = ({
  open,
  taskName,
  taskId,
  structuredFields,
  isFloatingTask,
  requiresPhoto = false,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [dynamicFields, setDynamicFields] = useState<any>(null)
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [availableQuantity, setAvailableQuantity] = useState<number | null>(null)
  const [isCheckingInventory, setIsCheckingInventory] = useState(false)
  const [photoData, setPhotoData] = useState<string | null>(null)  // 存储拍摄的照片
  
  // 价格相关状态（仅用于收货验货）
  const [unitPrice, setUnitPrice] = useState<number | null>(null)
  const [totalPrice, setTotalPrice] = useState<number | null>(null)
  const [priceCalculationTimer, setPriceCalculationTimer] = useState<NodeJS.Timeout | null>(null)
  const [priceInputMode, setPriceInputMode] = useState<'none' | 'unit' | 'total'>('none') // 价格输入模式

  // 加载动态字段（如果需要）
  useEffect(() => {
    if (open) {
      loadFields()
    }
  }, [open, taskName])

  const loadFields = async () => {
    // 如果是收货验货、损耗盘点或交割损耗，动态加载库存列表
    if (taskName.includes('收货') || taskName.includes('验货') || taskName.includes('损耗') || taskName.includes('盘点') || taskName.includes('交割')) {
      setIsLoadingFields(true)
      try {
        const user = authService.getCurrentUser()
        const department = user?.role === 'chef' ? '后厨' : '前厅'
        const isLossCount = taskName.includes('损耗盘点') || taskName.includes('交割损耗')
        
        // 生成动态字段（损耗类任务不需要质量检查）
        const fields = await inventoryService.generateStructuredFields(department as '前厅' | '后厨', isLossCount)
        
        // 如果是损耗盘点或交割损耗，添加损耗原因字段
        if (isLossCount) {
          fields.fields.push({
            key: 'reason',
            type: 'select',
            label: '损耗原因',
            options: taskName.includes('交割') ? ['交割处理', '去除淋巴', '去除脂肪', '其他'] : ['正常损耗', '过期', '损坏/丢失'],
            required: true
          })
        }
        
        setDynamicFields(fields)
      } catch (error) {
        console.error('Failed to load dynamic fields:', error)
        // 使用数据库配置的字段作为后备
        setDynamicFields(structuredFields)
      } finally {
        setIsLoadingFields(false)
      }
    } else {
      // 使用数据库配置的字段
      setDynamicFields(structuredFields)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const fields = dynamicFields?.fields || []
    
    for (const field of fields) {
      if (field.required && field.type !== 'auto' && !formData[field.key]) {
        newErrors[field.key] = `${field.label}是必填项`
      }
    }
    
    // 损耗盘点或交割损耗时验证数量不超过库存
    if ((taskName.includes('损耗') || taskName.includes('交割')) && formData.quantity && availableQuantity !== null) {
      if (formData.quantity > availableQuantity) {
        newErrors.quantity = `库存不足，当前库存：${availableQuantity}`
      }
    }
    
    // 交割损耗需要照片
    if (requiresPhoto && !photoData) {
      newErrors.photo = '请拍摄损耗照片'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) {
      return
    }

    // 准备提交数据，确保包含价格信息（仅收货验货）
    const finalData = { ...formData }
    
    // 确保价格信息被包含（仅收货验货任务）
    if (!taskName.includes('损耗')) {
      if (unitPrice !== null) {
        finalData.unit_price = unitPrice
      }
      if (totalPrice !== null) {
        finalData.total_price = totalPrice
      }
    }
    
    const submitData = {
      structured_data: finalData,
      note: note,
      type: requiresPhoto ? 'structured_photo' : 'structured_text',
      photo_url: photoData || undefined  // 包含照片数据
    }
    
    onSubmit(submitData)
    handleClose()
  }

  const handleClose = () => {
    setFormData({})
    setNote('')
    setErrors({})
    setUnitPrice(null)
    setTotalPrice(null)
    setPriceInputMode('none')
    setAvailableQuantity(null)
    setIsCheckingInventory(false)
    setPhotoData(null)
    if (priceCalculationTimer) {
      clearTimeout(priceCalculationTimer)
      setPriceCalculationTimer(null)
    }
    onClose()
  }

  const handleFieldChange = async (key: string, value: any) => {
    const newFormData = { ...formData, [key]: value }
    
    // 如果选择了物品，自动填充单位并检查库存
    if (key === 'item_name' && dynamicFields?.fields) {
      const unitField = dynamicFields.fields.find((f: any) => f.key === 'unit')
      if (unitField?.mapping && unitField.mapping[value]) {
        newFormData.unit = unitField.mapping[value]
      }
      
      // 如果是损耗盘点或交割损耗，获取当前库存数量
      if (taskName.includes('损耗') || taskName.includes('交割')) {
        setIsCheckingInventory(true)
        const quantity = await inventoryService.getItemQuantity(value)
        setAvailableQuantity(quantity)
        setIsCheckingInventory(false)
        
        // 如果已有数量，立即验证
        if (formData.quantity && quantity !== null) {
          if (formData.quantity > quantity) {
            setErrors(prev => ({ ...prev, quantity: `库存不足，当前库存：${quantity}` }))
          } else {
            setErrors(prev => ({ ...prev, quantity: '' }))
          }
        }
      }
    }
    
    // 如果修改了数量
    if (key === 'quantity') {
      // 损耗盘点或交割损耗时验证数量不超过库存
      if ((taskName.includes('损耗') || taskName.includes('交割')) && availableQuantity !== null) {
        if (value > availableQuantity) {
          setErrors(prev => ({ ...prev, quantity: `库存不足，当前库存：${availableQuantity}` }))
        } else {
          setErrors(prev => ({ ...prev, quantity: '' }))
        }
      }
      
      // 如果已有单价或总价，重新计算（收货验货时）
      if (!taskName.includes('损耗')) {
        if (unitPrice !== null && value > 0) {
          const newTotal = unitPrice * value
          setTotalPrice(Number(newTotal.toFixed(2)))
          newFormData.total_price = Number(newTotal.toFixed(2))
          newFormData.unit_price = unitPrice
        } else if (totalPrice !== null && value > 0) {
          const newUnit = totalPrice / value
          setUnitPrice(Number(newUnit.toFixed(2)))
          newFormData.unit_price = Number(newUnit.toFixed(2))
          newFormData.total_price = totalPrice
        }
      }
    }
    
    setFormData(newFormData)
    
    // 清除该字段的错误（数量字段的错误特殊处理）
    if (key !== 'quantity' && errors[key]) {
      setErrors({ ...errors, [key]: '' })
    }
  }
  // 处理单价输入
  const handleUnitPriceChange = (value: string) => {
    const price = parseFloat(value) || 0
    
    // 如果输入为空，重置状态
    if (!value || price <= 0) {
      setUnitPrice(null)
      setTotalPrice(null)
      setPriceInputMode('none')
      setFormData(prev => {
        const newData = { ...prev }
        delete newData.unit_price
        delete newData.total_price
        return newData
      })
      if (priceCalculationTimer) {
        clearTimeout(priceCalculationTimer)
        setPriceCalculationTimer(null)
      }
      return
    }
    
    // 设置单价输入模式
    setPriceInputMode('unit')
    setUnitPrice(price)
    
    // 清除之前的定时器
    if (priceCalculationTimer) {
      clearTimeout(priceCalculationTimer)
    }
    
    // 延迟2秒计算总价
    const currentQuantity = formData.quantity || 0
    
    if (currentQuantity > 0) {
      const timer = setTimeout(() => {
        const total = price * currentQuantity
        setTotalPrice(Number(total.toFixed(2)))
        setFormData(prev => ({ 
          ...prev, 
          unit_price: price,
          total_price: Number(total.toFixed(2)) 
        }))
      }, 2000)
      setPriceCalculationTimer(timer)
    }
  }
  
  // 处理总价输入
  const handleTotalPriceChange = (value: string) => {
    const total = parseFloat(value) || 0
    
    // 如果输入为空，重置状态
    if (!value || total <= 0) {
      setUnitPrice(null)
      setTotalPrice(null)
      setPriceInputMode('none')
      setFormData(prev => {
        const newData = { ...prev }
        delete newData.unit_price
        delete newData.total_price
        return newData
      })
      if (priceCalculationTimer) {
        clearTimeout(priceCalculationTimer)
        setPriceCalculationTimer(null)
      }
      return
    }
    
    // 设置总价输入模式
    setPriceInputMode('total')
    setTotalPrice(total)
    
    // 清除之前的定时器
    if (priceCalculationTimer) {
      clearTimeout(priceCalculationTimer)
    }
    
    // 延迟2秒计算单价
    const currentQuantity = formData.quantity || 0
    
    if (currentQuantity > 0) {
      const timer = setTimeout(() => {
        const unit = total / currentQuantity
        setUnitPrice(Number(unit.toFixed(2)))
        setFormData(prev => ({ 
          ...prev, 
          unit_price: Number(unit.toFixed(2)),
          total_price: total 
        }))
      }, 2000)
      setPriceCalculationTimer(timer)
    }
  }

  const getTaskIcon = () => {
    if (taskName.includes('损耗盘点')) {
      return <AssessmentIcon color="warning" />
    }
    return <InventoryIcon color="primary" />
  }

  const getTaskColor = () => {
    if (taskName.includes('损耗盘点')) {
      return 'warning.main'
    }
    return 'primary.main'
  }

  if (!dynamicFields?.enabled) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{taskName}</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            该任务暂未配置结构化输入字段
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>关闭</Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {getTaskIcon()}
          <Typography variant="h6" sx={{ color: getTaskColor() }}>
            {taskName}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {isLoadingFields ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Divider sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {taskName.includes('损耗盘点') ? '损耗信息' : '库存信息'}
              </Typography>
            </Divider>
            
            {dynamicFields?.fields?.map((field: any) => {
              // 跳过价格字段，稍后单独渲染
              if (field.key === 'unit_price' || field.key === 'total_price') {
                return null
              }
              
              if (field.type === 'select') {
                return (
                  <FormControl 
                    fullWidth 
                    sx={{ mb: 2 }} 
                    key={field.key}
                    error={!!errors[field.key]}
                  >
                    <InputLabel required={field.required}>
                      {field.label}
                    </InputLabel>
                    <Select
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      label={field.label}
                    >
                      {field.options?.map((option: string) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors[field.key] && (
                      <Typography variant="caption" color="error">
                        {errors[field.key]}
                      </Typography>
                    )}
                  </FormControl>
                )
              } else if (field.type === 'number') {
                // 损耗盘点的数量字段显示库存信息
                const isQuantityField = field.key === 'quantity'
                const showInventoryInfo = isQuantityField && taskName.includes('损耗') && availableQuantity !== null
                
                return (
                  <TextField
                    key={field.key}
                    fullWidth
                    sx={{ mb: 2 }}
                    type="number"
                    label={
                      showInventoryInfo 
                        ? `${field.label} (库存: ${availableQuantity})`
                        : field.label
                    }
                    value={formData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value) || 0)}
                    required={field.required}
                    error={!!errors[field.key]}
                    helperText={
                      errors[field.key] || 
                      (showInventoryInfo && !errors[field.key] ? `当前库存量: ${availableQuantity}` : '')
                    }
                    inputProps={{
                      min: field.min || 0,
                      step: field.decimal ? 0.01 : 1,
                      max: showInventoryInfo ? availableQuantity : undefined
                    }}
                    disabled={isCheckingInventory && isQuantityField}
                  />
                )
              } else if (field.type === 'auto' && formData[field.key]) {
                return (
                  <TextField
                    key={field.key}
                    fullWidth
                    sx={{ mb: 2 }}
                    label={field.label}
                    value={formData[field.key] || ''}
                    disabled
                    variant="filled"
                  />
                )
              }
              return null
            })}
            
            {/* 价格输入区域 - 仅收货验货显示价格 */}
            {(taskName.includes('收货') || taskName.includes('验货')) && (
              <>
                <Divider sx={{ my: 2 }}>
                  <Chip 
                    icon={<MoneyIcon />} 
                    label="价格信息" 
                    size="small"
                    color="primary"
                  />
                </Divider>
                
                {/* 收货验货 - 显示价格输入 */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="单价"
                      value={unitPrice !== null ? unitPrice : ''}
                      onChange={(e) => handleUnitPriceChange(e.target.value)}
                      disabled={priceInputMode === 'total'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                        endAdornment: formData.unit && (
                          <InputAdornment position="end">/{formData.unit}</InputAdornment>
                        )
                      }}
                      inputProps={{
                        min: 0,
                        step: 0.01
                      }}
                      helperText={
                        priceInputMode === 'total' ? '根据总价自动计算' :
                        priceInputMode === 'unit' ? '正在输入单价...' :
                        '输入后2秒自动计算总价'
                      }
                    />
                    
                    <TextField
                      fullWidth
                      type="number"
                      label="总价"
                      value={totalPrice !== null ? totalPrice : ''}
                      onChange={(e) => handleTotalPriceChange(e.target.value)}
                      disabled={priceInputMode === 'unit'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">¥</InputAdornment>
                      }}
                      inputProps={{
                        min: 0,
                        step: 0.01
                      }}
                      helperText={
                        priceInputMode === 'unit' ? '根据单价自动计算' :
                        priceInputMode === 'total' ? '正在输入总价...' :
                        '输入后2秒自动计算单价'
                      }
                    />
                </Box>
                
                {taskName.includes('收货验货') && (unitPrice || totalPrice) && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {unitPrice && totalPrice && (
                      <>价格信息：¥{unitPrice}/{formData.unit || '单位'} × {formData.quantity} = ¥{totalPrice}</>
                    )}
                  </Alert>
                )}
              </>
            )}
            
            {/* 拍照区域 - 仅交割损耗需要 */}
            {requiresPhoto && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Divider sx={{ mb: 2 }}>
                  <Chip 
                    icon={<PhotoCameraIcon />} 
                    label="拍照记录" 
                    size="small"
                    color="warning"
                  />
                </Divider>
                
                {photoData ? (
                  <Box sx={{ position: 'relative' }}>
                    <img 
                      src={photoData} 
                      alt="损耗照片" 
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', color: 'success.main' }}>
                      <CheckCircleIcon sx={{ mr: 1 }} />
                      <Typography variant="body2">已拍摄照片</Typography>
                    </Box>
                    <Button 
                      size="small" 
                      onClick={() => setPhotoData(null)}
                      sx={{ mt: 1 }}
                    >
                      重新拍照
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <input
                      accept="image/*"
                      capture="environment"
                      id="photo-capture"
                      type="file"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setPhotoData(reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    <label htmlFor="photo-capture">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<PhotoCameraIcon />}
                        fullWidth
                        color={errors.photo ? "error" : "warning"}
                      >
                        拍摄损耗照片（必需）
                      </Button>
                    </label>
                    {errors.photo && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        {errors.photo}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      请拍摄交割处理后的肉类，记录损耗情况
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="备注（可选）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                taskName.includes('损耗盘点') 
                  ? "请输入损耗详情或其他说明..."
                  : taskName.includes('交割')
                  ? "请输入交割处理详情..."
                  : "请输入其他需要说明的信息..."
              }
              sx={{ mt: 2 }}
            />
            
            {taskName.includes('收货验货') && (
              <Alert severity="info" sx={{ mt: 2 }}>
                提交后将自动更新库存数量
              </Alert>
            )}
            
            {taskName.includes('损耗盘点') && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                提交后将从库存中扣减相应数量
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          取消
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={isLoadingFields}
          color={taskName.includes('损耗盘点') ? 'warning' : 'primary'}
        >
          提交
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default StructuredInputDialog