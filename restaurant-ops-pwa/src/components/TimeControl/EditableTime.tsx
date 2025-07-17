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
  Chip
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

interface EditableTimeProps {
  testTime?: Date
  onTimeChange: (date: Date | undefined) => void
}

export const EditableTime: React.FC<EditableTimeProps> = ({ testTime, onTimeChange }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isEditing, setIsEditing] = useState(false)
  const [editHour, setEditHour] = useState(currentTime.getHours().toString().padStart(2, '0'))
  const [editMinute, setEditMinute] = useState(currentTime.getMinutes().toString().padStart(2, '0'))
  const [editSecond, setEditSecond] = useState(currentTime.getSeconds().toString().padStart(2, '0'))
  const [isTestMode, setIsTestMode] = useState(false)
  const [timeOffset, setTimeOffset] = useState(0) // Offset in milliseconds

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
    setIsEditing(true)
  }

  const handleSave = () => {
    const testTime = new Date()
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
      <Typography variant="body1">
        {currentTime.toLocaleString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })}
      </Typography>
      
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
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
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
            注意：这是测试功能，用于模拟不同时间查看任务状态
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