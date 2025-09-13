/**
 * Independent Editable Time Component
 * 独立的可编辑时间组件 - 不依赖任何Context，立即渲染
 * Version: 1.0.0
 * Created: 2025-01-13
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack
} from '@mui/material'
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material'
import { setGlobalTestTime, getCurrentTestTime } from '../../utils/globalTestTime'

interface IndependentEditableTimeProps {
  onTimeChange?: (date: Date) => void
  onResetTasks?: () => void
}

export const IndependentEditableTime: React.FC<IndependentEditableTimeProps> = ({
  onTimeChange,
  onResetTasks
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(getCurrentTestTime() || new Date())
  const [isEditing, setIsEditing] = useState(false)
  const [editTime, setEditTime] = useState('')
  const [editDate, setEditDate] = useState('')

  // 更新时间显示
  useEffect(() => {
    const timer = setInterval(() => {
      const testTime = getCurrentTestTime()
      if (testTime) {
        setCurrentTime(testTime)
      } else {
        setCurrentTime(new Date())
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleEditClick = () => {
    const date = getCurrentTestTime() || new Date()
    setEditTime(formatTime(date).slice(0, 5))
    setEditDate(formatDate(date))
    setIsEditing(true)
  }

  const handleSave = () => {
    if (editTime && editDate) {
      const [year, month, day] = editDate.split('-').map(Number)
      const [hours, minutes] = editTime.split(':').map(Number)
      const newDate = new Date(year, month - 1, day, hours, minutes, 0)

      setGlobalTestTime(newDate)
      setCurrentTime(newDate)

      if (onTimeChange) {
        onTimeChange(newDate)
      }
    }
    setIsEditing(false)
  }

  const handleReset = () => {
    setGlobalTestTime(null)
    const now = new Date()
    setCurrentTime(now)

    if (onTimeChange) {
      onTimeChange(now)
    }

    if (onResetTasks) {
      onResetTasks()
    }

    setIsEditing(false)
  }

  const isTestMode = getCurrentTestTime() !== null

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: isTestMode ? 'warning.light' : 'transparent',
          color: isTestMode ? 'warning.contrastText' : 'inherit'
        }}
      >
        <ScheduleIcon fontSize="small" />
        <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
          {formatTime(currentTime)}
        </Typography>
        <IconButton
          size="small"
          onClick={handleEditClick}
          sx={{
            color: 'inherit',
            '&:hover': {
              bgcolor: isTestMode ? 'warning.dark' : 'action.hover'
            }
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        {isTestMode && (
          <Typography variant="caption" sx={{ ml: 1 }}>
            测试模式
          </Typography>
        )}
      </Box>

      <Dialog open={isEditing} onClose={() => setIsEditing(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <ScheduleIcon />
            设置测试时间
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="日期"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="时间"
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            {isTestMode && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'warning.light',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Typography variant="body2" sx={{ flex: 1 }}>
                  当前处于测试模式
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleReset}
                  sx={{
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditing(false)}>取消</Button>
          <Button onClick={handleReset} color="warning">
            重置为当前时间
          </Button>
          <Button onClick={handleSave} variant="contained">
            确定
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}