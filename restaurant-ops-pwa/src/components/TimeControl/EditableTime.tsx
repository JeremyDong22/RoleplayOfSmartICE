// Editable time component for testing purposes
import { useState, useEffect } from 'react'
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

interface EditableTimeProps {
  testTime?: Date
  onTimeChange: (date: Date | undefined) => void
}

export const EditableTime: React.FC<EditableTimeProps> = ({ onTimeChange }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isEditing, setIsEditing] = useState(false)
  const [editHour, setEditHour] = useState(currentTime.getHours().toString().padStart(2, '0'))
  const [editMinute, setEditMinute] = useState(currentTime.getMinutes().toString().padStart(2, '0'))
  const [editSecond, setEditSecond] = useState(currentTime.getSeconds().toString().padStart(2, '0'))
  const [editYear, setEditYear] = useState(currentTime.getFullYear())
  const [editMonth, setEditMonth] = useState(currentTime.getMonth())
  const [editDay, setEditDay] = useState(currentTime.getDate())
  const [isTestMode, setIsTestMode] = useState(false)
  const [timeOffset, setTimeOffset] = useState(0) // Offset in milliseconds
  
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

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
    setEditHour(currentTime.getHours().toString().padStart(2, '0'))
    setEditMinute(currentTime.getMinutes().toString().padStart(2, '0'))
    setEditSecond(currentTime.getSeconds().toString().padStart(2, '0'))
    setEditYear(currentTime.getFullYear())
    setEditMonth(currentTime.getMonth())
    setEditDay(currentTime.getDate())
    setIsEditing(true)
  }

  const handleSave = () => {
    const testTime = new Date()
    testTime.setFullYear(editYear)
    testTime.setMonth(editMonth)
    testTime.setDate(editDay)
    testTime.setHours(parseInt(editHour))
    testTime.setMinutes(parseInt(editMinute))
    testTime.setSeconds(parseInt(editSecond))
    
    // Calculate offset between test time and current real time
    const realTime = new Date()
    const offset = testTime.getTime() - realTime.getTime()
    
    setTimeOffset(offset)
    setIsTestMode(true)
    setIsEditing(false)
  }

  const handleResetToRealTime = () => {
    setIsTestMode(false)
    setTimeOffset(0)
    onTimeChange(undefined)
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

      <Dialog open={isEditing} onClose={() => setIsEditing(false)}>
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
                const val = Math.max(2020, Math.min(2030, parseInt(e.target.value) || 2024))
                setEditYear(val)
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
                const val = Math.max(1, Math.min(31, parseInt(e.target.value) || 1))
                setEditDay(val)
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
                const val = Math.max(0, Math.min(23, parseInt(e.target.value) || 0))
                setEditHour(val.toString().padStart(2, '0'))
              }}
              inputProps={{ min: 0, max: 23 }}
              sx={{ width: 100 }}
            />
            <TextField
              label="分钟"
              type="number"
              value={editMinute}
              onChange={(e) => {
                const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                setEditMinute(val.toString().padStart(2, '0'))
              }}
              inputProps={{ min: 0, max: 59 }}
              sx={{ width: 100 }}
            />
            <TextField
              label="秒"
              type="number"
              value={editSecond}
              onChange={(e) => {
                const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                setEditSecond(val.toString().padStart(2, '0'))
              }}
              inputProps={{ min: 0, max: 59 }}
              sx={{ width: 100 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            注意：这是测试功能，用于模拟不同日期和时间查看任务状态。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditing(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            设置时间
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}