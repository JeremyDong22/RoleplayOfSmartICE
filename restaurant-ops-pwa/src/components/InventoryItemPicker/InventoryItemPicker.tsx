/**
 * InventoryItemPicker 组件
 * Created: 2025-08-21
 * Purpose: 可复用的库存物品选择器组件，支持搜索和自动完成
 * Features: 
 * - 实时搜索过滤
 * - 包含匹配（不限顺序）
 * - 可显示库存数量和单位
 * - 支持多场景使用
 */

import React, { useMemo } from 'react'
import { 
  Autocomplete, 
  TextField, 
  CircularProgress, 
  Chip,
  Box,
  Typography
} from '@mui/material'
import { 
  Inventory as InventoryIcon,
  Warning as WarningIcon 
} from '@mui/icons-material'
import { useInventoryItems } from './useInventoryItems'
import type { InventoryItemPickerProps, InventoryItemOption } from './types'

export const InventoryItemPicker: React.FC<InventoryItemPickerProps> = ({
  value,
  onChange,
  department,
  label = '物品名称',
  required = false,
  error = false,
  helperText = '',
  disabled = false,
  placeholder = '搜索或选择物品...',
  fullWidth = true,
  onItemSelect,
  excludeItems = [],
  customFilter,
  showQuantity = false,
  showUnit = false,
  allowCustom = false,
  loading: externalLoading = false
}) => {
  // 获取库存数据
  const { items, loading: internalLoading, error: loadError } = useInventoryItems(department)
  const loading = externalLoading || internalLoading
  
  // 过滤排除项
  const availableItems = useMemo(() => {
    return items.filter(item => !excludeItems.includes(item.item_name))
  }, [items, excludeItems])
  
  // 生成选项列表
  const options = useMemo((): InventoryItemOption[] => {
    return availableItems.map(item => {
      let label = item.item_name
      
      // 添加库存数量显示
      if (showQuantity) {
        label += ` (库存: ${item.quantity}${item.unit})`
      } else if (showUnit) {
        label += ` (${item.unit})`
      }
      
      return {
        label,
        value: item.item_name,
        item
      }
    })
  }, [availableItems, showQuantity, showUnit])
  
  // 查找当前选中的选项
  const selectedOption = useMemo(() => {
    if (!value || value === '') return null
    
    // 首先尝试从选项中查找
    const found = options.find(opt => opt.value === value)
    if (found) return found
    
    // 如果允许自定义值，返回自定义选项
    if (allowCustom) {
      return {
        label: value,
        value: value,
        item: null as any
      }
    }
    
    return null
  }, [value, options, allowCustom])
  
  return (
    <Autocomplete
      value={selectedOption}
      options={options}
      onChange={(event, newValue) => {
        if (typeof newValue === 'string') {
          // 处理自由输入的情况（当 freeSolo=true）
          onChange(newValue)
        } else if (newValue) {
          // 处理选择选项的情况
          onChange(newValue.value)
          if (onItemSelect && newValue.item) {
            onItemSelect(newValue.item)
          }
        } else {
          // 处理清空的情况
          onChange(null)
        }
      }}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option
        return option.label
      }}
      isOptionEqualToValue={(option, value) => {
        if (!value) return false
        if (!option) return false
        return option.value === value?.value || option.value === value
      }}
      renderInput={(params) => (
        <TextField 
          {...params}
          label={label}
          required={required}
          error={error || !!loadError}
          helperText={helperText || loadError}
          placeholder={placeholder}
          fullWidth={fullWidth}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InventoryIcon sx={{ mr: 1, color: 'action.active', fontSize: 20 }} />
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {loading && <CircularProgress size={20} />}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
      filterOptions={(options, state) => {
        if (!state.inputValue) return options
        
        // 使用自定义过滤器（如果提供）
        if (customFilter) {
          return options.filter(option => 
            customFilter(option.label, state.inputValue)
          )
        }
        
        // 默认过滤：包含匹配（不限顺序，不区分大小写）
        const input = state.inputValue.toLowerCase()
        return options.filter(option => {
          const label = option.label.toLowerCase()
          const value = option.value.toLowerCase()
          // 同时搜索标签和值
          return label.includes(input) || value.includes(input)
        })
      }}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props as any
        const item = option.item
        const isLowStock = item && showQuantity && item.warning_quantity && 
                          item.quantity <= item.warning_quantity
        
        return (
          <li key={key} {...otherProps}>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body1">
                  {option.value}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {showUnit && item && (
                    <Chip 
                      size="small" 
                      label={item.unit}
                      variant="outlined"
                    />
                  )}
                  {showQuantity && item && (
                    <Chip 
                      size="small" 
                      label={`库存: ${item.quantity}`}
                      color={isLowStock ? "warning" : "default"}
                      icon={isLowStock ? <WarningIcon fontSize="small" /> : undefined}
                    />
                  )}
                </Box>
              </Box>
              {item?.category && (
                <Typography variant="caption" color="text.secondary">
                  {item.category} {item.subcategory ? `/ ${item.subcategory}` : ''}
                </Typography>
              )}
            </Box>
          </li>
        )
      }}
      openOnFocus
      blurOnSelect
      clearOnEscape
      disabled={disabled || loading}
      noOptionsText={
        loading ? "加载中..." : 
        loadError ? "加载失败" : 
        "无匹配的物品"
      }
      freeSolo={allowCustom}
      sx={{ width: fullWidth ? '100%' : 'auto' }}
    />
  )
}

export default InventoryItemPicker