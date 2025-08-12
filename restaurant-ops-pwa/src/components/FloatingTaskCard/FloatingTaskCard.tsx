// 浮动任务卡片组件 - 用于展示独立于时间段的特殊任务（如收货验货）
// 更新：移除完成状态追踪，支持无限次提交
// 2025-08-11: 添加动态库存加载和结构化字段生成
import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Collapse,
  Alert,
  Snackbar,
  Tooltip
} from '@mui/material'
import {
  LocalShipping,
  ExpandMore,
  ExpandLess,
  PhotoCamera,
  Loop,
  History
} from '@mui/icons-material'
import type { TaskTemplate } from '../../types/task.types'
import { TaskSubmissionDialog } from '../TaskSubmissionDialog'
import { TodayRecordsDialog } from '../TodayRecordsDialog/TodayRecordsDialog'
import { specialTaskTheme } from '../../theme/specialTaskTheme'
import { inventoryService } from '../../services/inventoryService'
import { authService } from '../../services/authService'

interface FloatingTaskCardProps {
  tasks: TaskTemplate[]
  completedTaskIds: string[] // 保留接口兼容性，但不使用
  onTaskComplete: (taskId: string, evidence?: unknown) => void
  showWarning?: boolean
}

export const FloatingTaskCard: React.FC<FloatingTaskCardProps> = ({
  tasks,
  completedTaskIds: _completedTaskIds, // 保留参数但不使用
  onTaskComplete
}) => {
  const [expanded, setExpanded] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskTemplate | null>(null)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [dynamicStructuredFields, setDynamicStructuredFields] = useState<any>(null)
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false)

  // 加载动态结构化字段
  const loadDynamicFields = async (task: TaskTemplate) => {
    // 如果不是收货验货任务，直接使用原有配置
    if (!task.title.includes('收货验货')) {
      return task.structuredFields
    }

    setIsLoadingFields(true)
    try {
      // 获取用户部门
      const user = authService.getCurrentUser()
      const department = user?.role === 'chef' ? '后厨' : '前厅'
      
      // 生成动态结构化字段
      const fields = await inventoryService.generateStructuredFields(department as '前厅' | '后厨')
      console.log('[FloatingTaskCard] Generated dynamic fields:', fields)
      
      // 总是返回 enabled: true，即使没有物品也显示结构
      if (fields && fields.fields && fields.fields.length > 0) {
        setDynamicStructuredFields(fields)
        return {
          ...fields,
          enabled: true  // 确保总是启用
        }
      } else {
        // 即使没有物品，也返回基本结构
        console.warn('[FloatingTaskCard] No inventory items found for department:', department)
        return {
          enabled: true,  // 仍然启用，显示空的下拉框
          fields: [
            {
              key: 'item_name',
              type: 'select',
              label: '物品名称',
              options: [],  // 空选项
              required: true
            },
            {
              key: 'quantity',
              type: 'number',
              label: '数量',
              decimal: true,
              min: 0,
              required: true
            },
            {
              key: 'unit',
              type: 'text',
              label: '单位',
              required: false
            },
            {
              key: 'quality_check',
              type: 'select',
              label: '质量检查',
              options: ['合格', '不合格'],
              required: true
            }
          ],
          error: `没有找到${department}的库存物品，请先添加库存物品`
        }
      }
    } catch (error) {
      console.error('[FloatingTaskCard] Failed to load dynamic fields:', error)
      // 即使失败也显示基本结构
      return {
        enabled: true,  // 仍然启用
        fields: [
          {
            key: 'item_name',
            type: 'text',  // 降级为文本输入
            label: '物品名称',
            required: true
          },
          {
            key: 'quantity',
            type: 'number',
            label: '数量',
            decimal: true,
            min: 0,
            required: true
          },
          {
            key: 'unit',
            type: 'text',
            label: '单位',
            required: false
          },
          {
            key: 'quality_check',
            type: 'select',
            label: '质量检查',
            options: ['合格', '不合格'],
            required: true
          }
        ],
        error: '加载库存物品失败，请手动输入'
      }
    } finally {
      setIsLoadingFields(false)
    }
  }

  const handleTaskClick = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      // 加载动态字段
      const fields = await loadDynamicFields(task)
      
      // 创建带有动态字段的任务副本
      const taskWithDynamicFields = {
        ...task,
        structuredFields: fields || task.structuredFields
      }
      
      setSelectedTask(taskWithDynamicFields)
      setDialogOpen(true)
    }
  }

  const handleTaskSubmit = (taskId: string, data: any) => {
    const task = tasks.find(t => t.id === taskId)
    onTaskComplete(taskId, data)
    setDialogOpen(false)
    setSelectedTask(null)
    setSuccessMessage(`${task?.title || '任务'}已提交成功`)
  }

  return (
    <>
      <Paper 
        elevation={3} 
        sx={{ 
          mb: 2,
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f3f8ff 100%)',
          border: `2px solid ${specialTaskTheme.primary}`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: expanded ? '1px solid rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShipping sx={{ fontSize: 28, color: specialTaskTheme.iconColor }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                特殊任务
              </Typography>
              <Typography variant="body2" color="text.secondary">
                不受时间段限制，可随时提交，可多次提交
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={`可提交 ${tasks.length} 项`}
              size="small"
              icon={<Loop />}
              sx={{
                backgroundColor: specialTaskTheme.chip.background,
                color: specialTaskTheme.chip.color,
                fontWeight: 500,
                '& .MuiChip-icon': {
                  color: specialTaskTheme.chip.color
                }
              }}
            />
            <Tooltip title="查看今日上传记录">
              <IconButton 
                onClick={() => setRecordsDialogOpen(true)} 
                size="small"
                sx={{
                  color: specialTaskTheme.primary,
                  '&:hover': {
                    backgroundColor: 'rgba(33, 150, 243, 0.08)'
                  }
                }}
              >
                <History />
              </IconButton>
            </Tooltip>
            <IconButton onClick={() => setExpanded(!expanded)} size="small">
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        {/* Task List */}
        <Collapse in={expanded}>
          <Box sx={{ p: 2, pt: 0 }}>
            {tasks.map(task => (
              <Box 
                key={task.id}
                sx={{ 
                  p: 2,
                  mb: 1,
                  borderRadius: 1,
                  backgroundColor: specialTaskTheme.lightBackground,
                  border: `1px solid ${specialTaskTheme.borderColor}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 1,
                    borderColor: specialTaskTheme.primary
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 500,
                        color: 'text.primary'
                      }}
                    >
                      {task.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {task.description}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 2 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      startIcon={task.uploadRequirement === '拍照' ? <PhotoCamera /> : <Loop />}
                      onClick={() => handleTaskClick(task.id)}
                      sx={{ 
                        boxShadow: 2,
                        '&:hover': {
                          boxShadow: 4,
                          transform: 'translateY(-1px)'
                        }
                      }}
                    >
                      立即提交
                    </Button>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Paper>

      {/* Task Submission Dialog with Face Recognition */}
      {selectedTask && (
        <TaskSubmissionDialog
          open={dialogOpen}
          task={selectedTask}
          onClose={() => {
            setDialogOpen(false)
            setSelectedTask(null)
          }}
          onSubmit={handleTaskSubmit}
        />
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccessMessage('')} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Today's Records Dialog */}
      <TodayRecordsDialog
        open={recordsDialogOpen}
        taskIds={tasks.map(t => t.id)}
        onClose={() => setRecordsDialogOpen(false)}
      />
    </>
  )
}

export default FloatingTaskCard