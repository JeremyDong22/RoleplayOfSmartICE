/**
 * 备餐检查对话框
 * Created: 2025-01-11
 * Version: 1.8
 *
 * 更新日志：
 * - v1.8 (2025-11-09): 改进快捷按钮 - 添加+1按钮，移除按钮图标避免重复+号
 * - v1.7.1 (2025-11-09): 修复bugs - 移除遗留的errors/submitAttempted引用
 * - v1.7 (2025-11-09): 添加未填写项确认提示，防止误提交
 * - v1.6 (2025-11-09): 添加提交loading状态、+5快捷按钮、页面锁定
 * - v1.5 (2025-11-09): 删除新鲜度检查功能，简化为仅数量录入
 * - v1.4 (2025-11-09): 彻底修复数字输入框滚轮问题 - 改用type="text"+inputMode="numeric"
 * - v1.3 (2025-11-09): 修复数字输入框bug - 禁用鼠标滚轮和箭头键自动改变数值
 * - v1.2 (2025-11-09): 性能优化 - 使用React.memo和useCallback避免不必要的重新渲染
 * - v1.1 (2025-11-09): 修复Map状态更新bug，解决输入延迟和数值回退问题
 * - v1.0 (2025-01-11): 初始版本
 *
 * 设计思路：
 * - 从数据库加载餐厅的所有备餐菜品
 * - 逐个展示每个菜品，让用户输入数量
 * - 不是表格形式，而是卡片列表形式，适合手机操作
 * - 提交后存储到 task_records 的 structured_data 字段
 * - +5快捷按钮方便快速输入数量
 * - 未填写项确认提示，防止误提交不完整数据
 *
 * 性能优化：
 * - PrepItemCard使用React.memo，只有当前卡片数据变化时才重新渲染
 * - 回调函数使用useCallback，避免每次渲染创建新函数导致memo失效
 * - 自定义memo比较函数，精确控制重新渲染条件
 */

import React, { useState, useEffect, memo, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material'
import {
  Restaurant as RestaurantIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'
import { prepService } from '../../services/prepService'
import type { PrepItem, PrepCheckData } from '../../services/prepService'
import { authService } from '../../services/authService'

// 独立的菜品卡片组件，使用memo优化性能
interface PrepItemCardProps {
  item: PrepItem
  index: number
  data: PrepCheckData
  disabled: boolean
  onQuantityChange: (itemName: string, value: string) => void
  onAddOne: (itemName: string) => void
  onAddFive: (itemName: string) => void
}

const PrepItemCard = memo<PrepItemCardProps>(({
  item,
  index,
  data,
  disabled,
  onQuantityChange,
  onAddOne,
  onAddFive
}) => {
  // 计算完成状态
  const isComplete = data.quantity !== undefined

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: isComplete ? 'success.main' : 'divider',
        borderWidth: isComplete ? 2 : 1,
        opacity: disabled ? 0.6 : 1
      }}
    >
      <CardContent>
        {/* 菜品标题 */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6">
              {index + 1}. {item.item_name}
            </Typography>
            {item.category && (
              <Chip label={item.category} size="small" variant="outlined" />
            )}
          </Stack>
          {isComplete && (
            <CheckCircleIcon color="success" />
          )}
        </Stack>

        {/* 数量输入 with +1 +5按钮 */}
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            label="数量"
            type="text"
            inputMode="numeric"
            value={data.quantity === undefined ? '' : data.quantity}
            onChange={(e) => {
              const value = e.target.value
              // 只允许数字输入（包括0）
              if (value === '' || /^\d+$/.test(value)) {
                onQuantityChange(item.item_name, value)
              }
            }}
            size="small"
            disabled={disabled}
            placeholder="请输入数量（可以为0）"
            sx={{ flex: 1 }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => onAddOne(item.item_name)}
            disabled={disabled}
            sx={{
              minWidth: '60px',
              height: '40px'
            }}
          >
            +1
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onAddFive(item.item_name)}
            disabled={disabled}
            sx={{
              minWidth: '60px',
              height: '40px'
            }}
          >
            +5
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}, (prevProps, nextProps) => {
  // 自定义比较函数：只有当data或disabled变化时才重新渲染
  return (
    prevProps.data.quantity === nextProps.data.quantity &&
    prevProps.disabled === nextProps.disabled
  )
})

interface PrepChecklistDialogProps {
  open: boolean
  prepTime: '午市' | '晚市'
  onClose: () => void
  onSubmit: (data: any) => void
}

export const PrepChecklistDialog: React.FC<PrepChecklistDialogProps> = ({
  open,
  prepTime,
  onClose,
  onSubmit
}) => {
  const [prepItems, setPrepItems] = useState<PrepItem[]>([])
  const [checkData, setCheckData] = useState<Map<string, PrepCheckData>>(new Map())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [emptyItemsCount, setEmptyItemsCount] = useState(0)

  // 加载备餐菜品列表
  useEffect(() => {
    if (open) {
      loadPrepItems()
    }
  }, [open])

  const loadPrepItems = async () => {
    setLoading(true)
    try {
      const user = authService.getCurrentUser()
      const department = user?.roleCode === 'chef' ? '后厨' : '前厅'

      const items = await prepService.getPrepItems(undefined, department)
      setPrepItems(items)

      // 初始化checkData
      const initialData = new Map<string, PrepCheckData>()
      items.forEach(item => {
        initialData.set(item.item_name, {
          item_name: item.item_name
        })
      })
      setCheckData(initialData)
    } catch (error) {
      console.error('[PrepChecklistDialog] Failed to load prep items:', error)
    } finally {
      setLoading(false)
    }
  }

  // 更新某个菜品的数量 - 使用useCallback避免每次渲染都创建新函数
  const handleQuantityChange = useCallback((itemName: string, value: string) => {
    setCheckData(prev => {
      // 使用Number()而不是parseInt()，避免React 19 StrictMode的兼容性问题
      const quantity = value === '' ? undefined : Number(value)
      const current = prev.get(itemName)!
      const newMap = new Map(prev)
      newMap.set(itemName, {
        ...current,
        quantity
      })
      return newMap
    })
  }, [])

  // +1快捷按钮
  const handleAddOne = useCallback((itemName: string) => {
    setCheckData(prev => {
      const current = prev.get(itemName)!
      const currentQty = current.quantity || 0
      const newMap = new Map(prev)
      newMap.set(itemName, {
        ...current,
        quantity: currentQty + 1
      })
      return newMap
    })
  }, [])

  // +5快捷按钮
  const handleAddFive = useCallback((itemName: string) => {
    setCheckData(prev => {
      const current = prev.get(itemName)!
      const currentQty = current.quantity || 0
      const newMap = new Map(prev)
      newMap.set(itemName, {
        ...current,
        quantity: currentQty + 5
      })
      return newMap
    })
  }, [])

  // 提交检查结果
  const handleSubmit = async () => {
    // 检查是否有数量为空（undefined）的项
    const checkDataArray = Array.from(checkData.values())
    const emptyCount = checkDataArray.filter(item => item.quantity === undefined).length

    if (emptyCount > 0) {
      // 有未填写的项，显示确认对话框
      setEmptyItemsCount(emptyCount)
      setShowConfirmDialog(true)
      return
    }

    // 没有未填写的项，直接提交
    await performSubmit()
  }

  // 执行实际提交
  const performSubmit = async () => {
    setShowConfirmDialog(false)
    setSubmitting(true)

    try {
      // 格式化数据
      const checkDataArray = Array.from(checkData.values())
      const formattedData = prepService.formatPrepDataForStorage(checkDataArray, prepTime)
      const textSummary = prepService.generateTextSummary(checkDataArray)

      // 返回数据给父组件
      await onSubmit({
        type: 'structured_text',
        structured_data: formattedData,
        textInput: textSummary
      })
    } catch (error) {
      console.error('[PrepChecklistDialog] Submit failed:', error)
      setSubmitting(false)
    }
  }

  // 获取菜品检查完成状态
  const getItemCompletionStatus = (item: PrepItem): boolean => {
    const data = checkData.get(item.item_name)
    if (!data) return false
    return !!data.quantity
  }

  // 计算完成进度
  const getCompletionProgress = (): { completed: number, total: number } => {
    const completed = prepItems.filter(item => getItemCompletionStatus(item)).length
    return { completed, total: prepItems.length }
  }

  const progress = getCompletionProgress()

  return (
    <>
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      fullScreen // 移动端全屏
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <RestaurantIcon />
          <Typography variant="h6">备餐验收 - {prepTime}</Typography>
          <Chip
            label={`${progress.completed}/${progress.total}`}
            color={progress.completed === progress.total ? 'success' : 'default'}
            size="small"
          />
        </Stack>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* 说明文字 */}
            <Alert severity="info" sx={{ mb: 2 }}>
              请逐个输入每个菜品的数量，完成所有检查项后提交
            </Alert>

            {/* 菜品列表 */}
            <Stack spacing={2}>
              {prepItems.map((item, index) => (
                <PrepItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  data={checkData.get(item.item_name)!}
                  disabled={submitting}
                  onQuantityChange={handleQuantityChange}
                  onAddOne={handleAddOne}
                  onAddFive={handleAddFive}
                />
              ))}
            </Stack>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={submitting}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || submitting || progress.completed === 0}
          startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : (progress.completed === progress.total ? <CheckCircleIcon /> : <CancelIcon />)}
        >
          {submitting ? '上传中...' : `提交检查结果 (${progress.completed}/${progress.total})`}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={showConfirmDialog}
      onClose={() => setShowConfirmDialog(false)}
      maxWidth="xs"
    >
      <DialogTitle>
        确认提交
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          还有 <strong>{emptyItemsCount}</strong> 个菜品未填写数量
        </Alert>
        <Typography>
          确定要提交吗？未填写的菜品将不会被记录。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowConfirmDialog(false)} color="inherit">
          返回填写
        </Button>
        <Button onClick={performSubmit} variant="contained" color="warning">
          确认提交
        </Button>
      </DialogActions>
    </Dialog>
  </>
  )
}

export default PrepChecklistDialog
