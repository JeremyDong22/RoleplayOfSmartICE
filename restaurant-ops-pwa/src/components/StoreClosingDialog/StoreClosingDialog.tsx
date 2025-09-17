// 闭店确认对话框组件
// Version: 1.1.0
// Created: 2025-01-18
// Updated: 2025-01-18 - Fixed role label display to properly show 店长/值班经理/厨师 based on role_code
// Purpose: 显示闭店验证结果，支持三种状态：SUCCESS（直接闭店）、WARNING（确认后闭店）、ERROR（禁止闭店）

import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

interface MissingTask {
  id: string
  title: string
  roleCode: string
  periodName: string
  timeSlot?: string
}

interface ClosingValidation {
  canClose: boolean
  validationLevel: 'SUCCESS' | 'WARNING' | 'ERROR'
  message: string
  closingPeriod: {
    isCompleted: boolean
    totalTasks: number
    completedCount: number
    missingTasks: MissingTask[]
  }
  otherPeriods: {
    isCompleted: boolean
    totalTasks: number
    completedCount: number
    missingTasks: MissingTask[]
    missingByPeriod: Record<string, Array<{
      id: string
      title: string
      roleCode: string
    }>>
  }
  actionsRequired: Array<{
    type: 'COMPLETE_TASK' | 'CONFIRM_SKIP'
    priority: 'CRITICAL' | 'OPTIONAL'
    description: string
    tasks: any[]
  }>
}

interface StoreClosingDialogProps {
  open: boolean
  validation: ClosingValidation | null
  onClose: () => void
  onConfirm: () => void
  onGoToTasks?: () => void
}

export const StoreClosingDialog: React.FC<StoreClosingDialogProps> = ({
  open,
  validation,
  onClose,
  onConfirm,
  onGoToTasks
}) => {
  if (!validation) return null

  const getIcon = () => {
    switch (validation.validationLevel) {
      case 'SUCCESS':
        return <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
      case 'WARNING':
        return <WarningIcon sx={{ fontSize: 48, color: 'warning.main' }} />
      case 'ERROR':
        return <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />
    }
  }

  const getTitle = () => {
    switch (validation.validationLevel) {
      case 'SUCCESS':
        return '✅ 可以安全闭店'
      case 'WARNING':
        return '⚠️ 闭店确认'
      case 'ERROR':
        return '❌ 无法闭店'
    }
  }

  const getAlertSeverity = () => {
    switch (validation.validationLevel) {
      case 'SUCCESS':
        return 'success'
      case 'WARNING':
        return 'warning'
      case 'ERROR':
        return 'error'
    }
  }

  const renderTaskList = (tasks: MissingTask[], showPeriod: boolean = true) => (
    <List dense>
      {tasks.map((task) => (
        <ListItem key={task.id}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <RadioButtonUncheckedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText
            primary={task.title}
            secondaryTypographyProps={{ component: 'div' }}
            secondary={
              <Box component="span" sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {showPeriod && (
                  <Chip
                    label={task.periodName}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20 }}
                  />
                )}
                <Chip
                  label={
                    task.roleCode === 'manager' ? '店长' :
                    task.roleCode === 'duty_manager' ? '值班经理' :
                    task.roleCode === 'chef' ? '厨师' :
                    '员工'
                  }
                  size="small"
                  color={
                    task.roleCode === 'manager' ? 'primary' :
                    task.roleCode === 'duty_manager' ? 'secondary' :
                    task.roleCode === 'chef' ? 'warning' :
                    'default'
                  }
                  sx={{ height: 20 }}
                />
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  )

  const renderMissingByPeriod = () => {
    const { missingByPeriod } = validation.otherPeriods
    const periods = Object.keys(missingByPeriod || {})

    if (periods.length === 0) return null

    return (
      <Box sx={{ mt: 2 }}>
        {periods.map((periodName) => (
          <Accordion key={periodName} defaultExpanded={periods.length <= 3}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                {periodName} ({missingByPeriod[periodName].length} 个任务)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {missingByPeriod[periodName].map((task) => (
                  <ListItem key={task.id}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <RadioButtonUncheckedIcon fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={task.title}
                      secondary={
                        <Box component="span" sx={{ display: 'inline-block', mt: 0.5 }}>
                          <Chip
                            label={
                              task.roleCode === 'manager' ? '店长' :
                              task.roleCode === 'duty_manager' ? '值班经理' :
                              task.roleCode === 'chef' ? '厨师' :
                              '员工'
                            }
                            size="small"
                            sx={{ height: 18 }}
                          />
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getIcon()}
          <Typography variant="h6">{getTitle()}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity={getAlertSeverity()} sx={{ mb: 2 }}>
          {validation.message}
        </Alert>

        {/* 闭店时段任务状态 */}
        {validation.closingPeriod.totalTasks > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              闭店任务完成情况
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                已完成 {validation.closingPeriod.completedCount} / {validation.closingPeriod.totalTasks}
              </Typography>
              {validation.closingPeriod.isCompleted ? (
                <Chip
                  icon={<TaskAltIcon />}
                  label="全部完成"
                  color="success"
                  size="small"
                />
              ) : (
                <Chip
                  label={`${validation.closingPeriod.totalTasks - validation.closingPeriod.completedCount} 个未完成`}
                  color="error"
                  size="small"
                />
              )}
            </Box>

            {!validation.closingPeriod.isCompleted && validation.closingPeriod.missingTasks && (
              <Box sx={{ bgcolor: 'error.lighter', borderRadius: 1, p: 1 }}>
                {renderTaskList(validation.closingPeriod.missingTasks, false)}
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* 其他时段任务状态 */}
        {validation.otherPeriods.totalTasks > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              其他时段任务完成情况
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                已完成 {validation.otherPeriods.completedCount} / {validation.otherPeriods.totalTasks}
              </Typography>
              {validation.otherPeriods.isCompleted ? (
                <Chip
                  icon={<TaskAltIcon />}
                  label="全部完成"
                  color="success"
                  size="small"
                />
              ) : (
                <Chip
                  label={`${validation.otherPeriods.totalTasks - validation.otherPeriods.completedCount} 个未完成`}
                  color="warning"
                  size="small"
                />
              )}
            </Box>

            {!validation.otherPeriods.isCompleted && (
              <Box sx={{ bgcolor: 'warning.lighter', borderRadius: 1, p: 1 }}>
                {renderMissingByPeriod()}
              </Box>
            )}
          </Box>
        )}

        {/* 操作提示 */}
        {validation.actionsRequired.length > 0 && (
          <Box sx={{ mt: 3 }}>
            {validation.actionsRequired.map((action, index) => (
              <Alert
                key={index}
                severity={action.priority === 'CRITICAL' ? 'error' : 'info'}
                sx={{ mb: 1 }}
              >
                {action.description}
              </Alert>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {validation.validationLevel === 'ERROR' ? (
          <>
            <Button onClick={onClose}>
              取消
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onGoToTasks}
            >
              去完成任务
            </Button>
          </>
        ) : validation.validationLevel === 'WARNING' ? (
          <>
            <Button onClick={onClose}>
              稍后处理
            </Button>
            <Button
              variant="outlined"
              onClick={onGoToTasks}
            >
              查看详情
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={onConfirm}
            >
              确认闭店
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>
              取消
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={onConfirm}
            >
              确认闭店
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default StoreClosingDialog