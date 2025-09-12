import React, { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { getCurrentTestTime } from '../../utils/globalTestTime'

interface TimeDisplayProps {
  testTime?: Date
}

const TimeDisplay: React.FC<TimeDisplayProps> = ({ testTime }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => {
      if (testTime) {
        setCurrentTime(testTime)
      } else {
        const globalTestTime = getCurrentTestTime()
        setCurrentTime(globalTestTime || new Date())
      }
    }, 1000)
    
    return () => clearInterval(timer)
  }, [testTime])
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mr: 2 }}>
      <Typography variant="body1" sx={{ color: 'white', lineHeight: 1.2 }}>
        {currentTime.toLocaleString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })}
      </Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', lineHeight: 1 }}>
        {currentTime.toLocaleDateString('zh-CN', { 
          month: 'short',
          day: 'numeric'
        })}
      </Typography>
    </Box>
  )
}

export default TimeDisplay