// Status Island component - shows current and next status
import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import { alpha } from '@mui/material/styles'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import type { WorkflowPeriod } from '../../utils/workflowParser'

interface StatusIslandProps {
  currentPeriod: WorkflowPeriod | null
  nextPeriod: WorkflowPeriod | null
  testTime?: Date
}

export const StatusIsland: React.FC<StatusIslandProps> = ({ 
  currentPeriod, 
  nextPeriod,
  testTime 
}) => {
  const now = testTime || new Date()
  
  // Calculate time remaining in current period
  const getTimeRemaining = () => {
    if (!currentPeriod) return null
    
    const [endHour, endMinute] = currentPeriod.endTime.split(':').map(Number)
    const endTime = new Date(now)
    endTime.setHours(endHour, endMinute, 0, 0)
    
    const remaining = endTime.getTime() - now.getTime()
    const minutes = Math.floor(remaining / 1000 / 60)
    
    if (minutes <= 0) return '即将结束'
    if (minutes < 60) return `${minutes}分钟`
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小时${mins > 0 ? `${mins}分钟` : ''}`
  }
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: theme => alpha(theme.palette.background.paper, 0.95),
        backdropFilter: 'blur(10px)',
        borderRadius: 4,
        px: 3,
        py: 1.5,
        boxShadow: theme => theme.shadows[4],
        border: theme => `1px solid ${alpha(theme.palette.divider, 0.1)}`
      }}
    >
      {/* Current Status */}
      {currentPeriod && (
        <Box display="flex" alignItems="center" gap={1}>
          <AccessTimeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="body2" fontWeight="bold">
            {currentPeriod.displayName}
          </Typography>
          <Chip 
            label={getTimeRemaining()} 
            size="small" 
            color="primary"
            variant="outlined"
          />
        </Box>
      )}
      
      {/* Divider */}
      {currentPeriod && nextPeriod && (
        <Box 
          sx={{ 
            width: 1, 
            height: 20, 
            backgroundColor: 'divider',
            opacity: 0.3
          }} 
        />
      )}
      
      {/* Next Status */}
      {nextPeriod && (
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">
            下一阶段:
          </Typography>
          <Typography variant="body2">
            {nextPeriod.displayName} ({nextPeriod.startTime})
          </Typography>
        </Box>
      )}
      
      {/* Closed Status */}
      {!currentPeriod && (
        <Typography variant="body2" color="text.secondary">
          营业时间外
        </Typography>
      )}
    </Box>
  )
}