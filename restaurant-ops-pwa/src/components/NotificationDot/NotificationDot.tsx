// Notification Dot Component - Shows pending task posts indicator
// Created: Visual notification system for task review
import React from 'react'
import { Box, Badge, keyframes } from '@mui/material'

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`

interface NotificationDotProps {
  count: number
  showNumber?: boolean
  size?: 'small' | 'medium' | 'large'
  animate?: boolean
}

export const NotificationDot: React.FC<NotificationDotProps> = ({ 
  count, 
  showNumber = false,
  size = 'medium',
  animate = true 
}) => {
  if (count === 0) return null

  const sizeMap = {
    small: 8,
    medium: 10,
    large: 12
  }

  const dotSize = sizeMap[size]

  if (showNumber) {
    return (
      <Badge 
        badgeContent={count} 
        color="error"
        sx={{
          '& .MuiBadge-badge': {
            fontSize: '0.75rem',
            height: 20,
            minWidth: 20,
            animation: animate && count > 0 ? `${pulse} 2s infinite` : 'none',
          }
        }}
      />
    )
  }

  return (
    <Box
      sx={{
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        backgroundColor: 'error.main',
        animation: animate ? `${pulse} 2s infinite` : 'none',
        boxShadow: theme => `0 0 4px ${theme.palette.error.main}`,
      }}
    />
  )
}