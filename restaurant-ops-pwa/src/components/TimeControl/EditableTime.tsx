// Editable time component for testing purposes
// Fixed input handling for number fields to allow users to clear and type new values
// Added onBlur handlers to ensure valid values when focus is lost
// Fixed date refresh bug: dialog fields now use current time snapshot when opened to prevent continuous updates
// Added global test time support for cross-role testing
import React, { useState, useEffect, useMemo } from 'react'
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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { 
  getGlobalTestTime, 
  setGlobalTestTime, 
  clearGlobalTestTime, 
  getCurrentTestTime,
  useGlobalTestTime 
} from '../../utils/globalTestTime'
import { broadcastService } from '../../services/broadcastService'
import { clearAllAppStorage } from '../../utils/clearAllStorage'

interface EditableTimeProps {
  testTime?: Date
  onTimeChange: (date: Date | undefined) => void
  onResetTasks?: () => void  // 新增：重置任务的回调函数
}

const EditableTimeComponent: React.FC<EditableTimeProps> = ({ testTime, onTimeChange, onResetTasks }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isEditing, setIsEditing] = useState(false)
  const [editHour, setEditHour] = useState<string>('')
  const [editMinute, setEditMinute] = useState<string>('')
  const [editSecond, setEditSecond] = useState<string>('')
  const [editYear, setEditYear] = useState<string>('')
  const [editMonth, setEditMonth] = useState(0)
  const [editDay, setEditDay] = useState<string>('')
  // Store the time when dialog was opened to prevent updates
  const [dialogOpenTime, setDialogOpenTime] = useState<Date | null>(null)
  const [isTestMode, setIsTestMode] = useState(false)
  const [timeOffset, setTimeOffset] = useState(0) // Offset in milliseconds
  
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  
  // Initialize from global test time on mount
  useEffect(() => {
    const globalTestTime = getGlobalTestTime()
    if (globalTestTime && globalTestTime.enabled) {
      setIsTestMode(true)
      setTimeOffset(globalTestTime.offset)
    }
  }, [])
  
  // Subscribe to global test time changes
  useEffect(() => {
    const cleanup = useGlobalTestTime((testTime) => {
      if (testTime) {
        const globalTestTime = getGlobalTestTime()
        if (globalTestTime) {
          setIsTestMode(true)
          setTimeOffset(globalTestTime.offset)
        }
      } else {
        setIsTestMode(false)
        setTimeOffset(0)
      }
    })
    
    return cleanup
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      let newTime: Date
      if (isTestMode && timeOffset !== 0) {
        // Calculate current time with offset
        newTime = new Date(Date.now() + timeOffset)
        setCurrentTime(newTime)
        // Update parent component with new test time
        onTimeChange(newTime)
      } else {
        newTime = new Date()
        setCurrentTime(newTime)
        if (isTestMode) {
          // If test mode is on but offset is 0, still pass the time
          onTimeChange(newTime)
        } else {
          // Not in test mode
          onTimeChange(undefined)
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [isTestMode, timeOffset, onTimeChange])

  const handleEdit = () => {
    // Use the current time snapshot when opening the dialog
    const now = new Date(currentTime)  // Create a copy
    // console.log('Opening dialog with time:', now.toLocaleString())
    setEditHour(now.getHours().toString().padStart(2, '0'))
    setEditMinute(now.getMinutes().toString().padStart(2, '0'))
    setEditSecond(now.getSeconds().toString().padStart(2, '0'))
    setEditYear(now.getFullYear().toString())
    setEditMonth(now.getMonth())
    setEditDay(now.getDate().toString())
    setDialogOpenTime(now)  // Store the time when dialog opened
    setIsEditing(true)
  }

  const handleSave = () => {
    const testTime = new Date()
    testTime.setFullYear(parseInt(editYear) || new Date().getFullYear())
    testTime.setMonth(editMonth)
    testTime.setDate(parseInt(editDay) || 1)
    testTime.setHours(parseInt(editHour) || 0)
    testTime.setMinutes(parseInt(editMinute) || 0)
    testTime.setSeconds(parseInt(editSecond) || 0)
    
    // Calculate offset between test time and current real time
    const realTime = new Date()
    const offset = testTime.getTime() - realTime.getTime()
    
    // Save to global test time
    setGlobalTestTime(offset)
    
    setTimeOffset(offset)
    setIsTestMode(true)
    setIsEditing(false)
  }

  const handleResetToRealTime = () => {
    setIsTestMode(false)
    setTimeOffset(0)
    onTimeChange(undefined)
    
    // Clear global test time
    clearGlobalTestTime()
  }

  const handleResetTasks = () => {
    if (confirm('确定要重置所有任务状态吗？这将清空所有页面的所有任务记录和存储数据。')) {
      // Clear all local storage across all tabs
      clearAllAppStorage()
      
      // Broadcast to all other tabs to clear their storage
      broadcastService.send('CLEAR_ALL_STORAGE', {}, 'system')
      
      // Call the parent's reset handler if provided
      onResetTasks?.()
      
      // Close the dialog
      setIsEditing(false)
      
      // Reload the page after a short delay to ensure storage is cleared
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="body1">
          {currentTime.toLocaleString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          })}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>
          {currentTime.toLocaleDateString('zh-CN', { 
            month: 'short',
            day: 'numeric'
          })}
        </Typography>
      </Box>
      
      {isTestMode && (
        <Chip 
          label="测试模式" 
          size="small" 
          color="warning" 
          onDelete={handleResetToRealTime}
        />
      )}
      
      <IconButton 
        size="small" 
        onClick={handleEdit}
        sx={{ 
          color: 'white',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
        }}
      >
        <EditIcon fontSize="small" />
      </IconButton>

      <Dialog 
        open={isEditing} 
        onClose={() => setIsEditing(false)}
        // Prevent dialog from re-rendering when parent updates
        disableRestoreFocus
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon />
            编辑时间（测试用）
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>日期设置</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="年份"
              type="number"
              value={editYear}
              onChange={(e) => {
                const inputValue = e.target.value
                // Allow any input including empty string
                setEditYear(inputValue)
              }}
              onBlur={(e) => {
                const inputValue = e.target.value
                const val = parseInt(inputValue)
                if (isNaN(val) || val < 2020 || val > 2030) {
                  setEditYear(new Date().getFullYear().toString())
                } else {
                  setEditYear(val.toString())
                }
              }}
              inputProps={{ min: 2020, max: 2030 }}
              sx={{ width: 120 }}
            />
            <FormControl sx={{ width: 120 }}>
              <InputLabel>月份</InputLabel>
              <Select
                value={editMonth}
                onChange={(e) => setEditMonth(e.target.value as number)}
                label="月份"
              >
                {months.map((month, index) => (
                  <MenuItem key={index} value={index}>{month}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="日期"
              type="number"
              value={editDay}
              onChange={(e) => {
                const inputValue = e.target.value
                // Allow any input including empty string
                setEditDay(inputValue)
              }}
              onBlur={(e) => {
                // On blur, ensure we have a valid value
                const inputValue = e.target.value
                const val = parseInt(inputValue)
                if (isNaN(val) || val < 1 || val > 31) {
                  setEditDay(new Date().getDate().toString())
                } else {
                  setEditDay(Math.max(1, Math.min(31, val)).toString())
                }
              }}
              inputProps={{ min: 1, max: 31 }}
              sx={{ width: 100 }}
            />
          </Box>
          
          <Typography variant="subtitle2" sx={{ mb: 2 }}>时间设置</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="小时"
              type="number"
              value={editHour}
              onChange={(e) => {
                const inputValue = e.target.value
                if (inputValue === '') {
                  setEditHour('')
                  return
                }
                const val = parseInt(inputValue)
                if (!isNaN(val)) {
                  const bounded = Math.max(0, Math.min(23, val))
                  setEditHour(bounded.toString().padStart(2, '0'))
                }
              }}
              onBlur={(e) => {
                const inputValue = e.target.value
                if (inputValue === '' || isNaN(parseInt(inputValue))) {
                  setEditHour('00')
                }
              }}
              inputProps={{ min: 0, max: 23 }}
              sx={{ width: 100 }}
            />
            <TextField
              label="分钟"
              type="number"
              value={editMinute}
              onChange={(e) => {
                const inputValue = e.target.value
                if (inputValue === '') {
                  setEditMinute('')
                  return
                }
                const val = parseInt(inputValue)
                if (!isNaN(val)) {
                  const bounded = Math.max(0, Math.min(59, val))
                  setEditMinute(bounded.toString().padStart(2, '0'))
                }
              }}
              onBlur={(e) => {
                const inputValue = e.target.value
                if (inputValue === '' || isNaN(parseInt(inputValue))) {
                  setEditMinute('00')
                }
              }}
              inputProps={{ min: 0, max: 59 }}
              sx={{ width: 100 }}
            />
            <TextField
              label="秒"
              type="number"
              value={editSecond}
              onChange={(e) => {
                const inputValue = e.target.value
                if (inputValue === '') {
                  setEditSecond('')
                  return
                }
                const val = parseInt(inputValue)
                if (!isNaN(val)) {
                  const bounded = Math.max(0, Math.min(59, val))
                  setEditSecond(bounded.toString().padStart(2, '0'))
                }
              }}
              onBlur={(e) => {
                const inputValue = e.target.value
                if (inputValue === '' || isNaN(parseInt(inputValue))) {
                  setEditSecond('00')
                }
              }}
              inputProps={{ min: 0, max: 59 }}
              sx={{ width: 100 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            注意：这是测试功能，用于模拟不同日期和时间查看任务状态。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
          <Button 
            onClick={handleResetTasks} 
            color="error"
            disabled={!onResetTasks}
            sx={{ mr: 'auto' }}
          >
            重置任务
          </Button>
          <Box>
            <Button onClick={() => setIsEditing(false)}>取消</Button>
            <Button onClick={handleSave} variant="contained" sx={{ ml: 1 }}>
              设置时间
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// Memoize the component to prevent re-renders when parent updates
export const EditableTime = React.memo(EditableTimeComponent)