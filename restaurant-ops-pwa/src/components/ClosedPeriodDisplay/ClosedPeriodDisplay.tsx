// Shared component for displaying closed period with countdown
// Created to ensure consistent styling between Manager and Chef dashboards
import React, { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import type { WorkflowPeriod } from '../../utils/workflowParser'

interface ClosedPeriodDisplayProps {
  nextPeriod: WorkflowPeriod | null
  testTime?: Date
}

export const ClosedPeriodDisplay: React.FC<ClosedPeriodDisplayProps> = ({ nextPeriod, testTime }) => {
  const [timeUntilNext, setTimeUntilNext] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)
  
  useEffect(() => {
    if (!nextPeriod) return
    
    const calculateTime = () => {
      const now = testTime || new Date()
      const [startHour, startMinute] = nextPeriod.startTime.split(':').map(Number)
      const nextStart = new Date(now)
      nextStart.setHours(startHour, startMinute, 0, 0)
      
      // If the next period is tomorrow
      if (now > nextStart) {
        nextStart.setDate(nextStart.getDate() + 1)
      }
      
      const timeDiff = nextStart.getTime() - now.getTime()
      
      if (timeDiff > 0) {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff / (1000 * 60)) % 60)
        const seconds = Math.floor((timeDiff / 1000) % 60)
        setTimeUntilNext({ hours, minutes, seconds })
      } else {
        setTimeUntilNext({ hours: 0, minutes: 0, seconds: 0 })
      }
    }
    
    calculateTime()
    const interval = setInterval(calculateTime, 1000)
    return () => clearInterval(interval)
  }, [nextPeriod, testTime])
  
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Status - positioned absolutely above the circle */}
        <Typography 
          variant="overline" 
          sx={{ 
            color: 'text.disabled',
            letterSpacing: 2,
            fontSize: '0.75rem',
            position: 'absolute',
            bottom: '13.5rem', // Use rem units for flexible spacing
            whiteSpace: 'nowrap'
          }}
        >
          当前状态：{nextPeriod ? '休息中' : '非营业时间'}
        </Typography>
        
        {/* Next Period Name or Non-business message - also absolute, but closer to the circle */}
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'text.secondary',
            fontWeight: 'normal',
            position: 'absolute',
            bottom: '11rem', // Positioned relative to the circle's 10rem height
            whiteSpace: 'nowrap'
          }}
        >
          {nextPeriod ? `下一阶段：${nextPeriod.displayName}` : '今日非营业日或营业时间已结束'}
        </Typography>

        {/* Circle Container - this is the centered element */}
        <Box 
          sx={{ 
            position: 'relative',
            width: 160,
            height: 160
          }}
        >
          {/* Background Circle */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: theme => {
                if (!nextPeriod) return `3px solid ${theme.palette.grey[400]}`
                if (!timeUntilNext) return `3px solid ${theme.palette.primary.main}`
                const totalMinutes = timeUntilNext.hours * 60 + timeUntilNext.minutes
                const totalSeconds = totalMinutes * 60 + timeUntilNext.seconds
                return `3px solid ${totalSeconds <= 300 ? theme.palette.warning.main : theme.palette.primary.main}`
              },
              opacity: 0.2,
              transition: 'all 0.3s ease'
            }}
          />
          
          {/* Countdown Time or Non-business message */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}
          >
            {nextPeriod && timeUntilNext ? (
              <Typography 
                variant="h1" 
                sx={{ 
                  fontWeight: 300,
                  fontSize: '2rem',
                  color: theme => {
                    const totalMinutes = timeUntilNext.hours * 60 + timeUntilNext.minutes
                    const totalSeconds = totalMinutes * 60 + timeUntilNext.seconds
                    return totalSeconds <= 300 ? theme.palette.warning.main : theme.palette.primary.main
                  },
                  lineHeight: 1
                }}
              >
                {String(timeUntilNext.hours).padStart(2, '0')}:
                {String(timeUntilNext.minutes).padStart(2, '0')}:
                {String(timeUntilNext.seconds).padStart(2, '0')}
              </Typography>
            ) : (
              <Typography 
                variant="h2" 
                sx={{ 
                  fontWeight: 300,
                  fontSize: '1.5rem',
                  color: 'text.disabled',
                  lineHeight: 1
                }}
              >
                —
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}