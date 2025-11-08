/**
 * Task Reminder Banner Component
 * Version 2.0 - Floating tooltip pointing to tasks icon in bottom navigation
 * Created: 2025-11-08
 */

import React, { useEffect, useState } from 'react'
import { Paper, Typography, IconButton, Box, Fade } from '@mui/material'
import { Close } from '@mui/icons-material'
import { useLocation } from 'react-router-dom'

interface TaskReminderBannerProps {
  role?: 'manager' | 'chef' | 'duty-manager' | 'ceo'
}

export const TaskReminderBanner: React.FC<TaskReminderBannerProps> = ({ role }) => {
  const [showBanner, setShowBanner] = useState(false)
  const location = useLocation()

  // Check if user is on the tasks page
  const isOnTasksPage = location.pathname === `/manager` ||
                        location.pathname === `/chef` ||
                        location.pathname === `/duty-manager` ||
                        location.pathname === `/ceo`

  useEffect(() => {
    // Get today's date as key for localStorage
    const today = new Date().toDateString()
    const dismissedDate = localStorage.getItem('taskReminderDismissed')

    // Show banner if:
    // 1. Not dismissed today
    // 2. ON the tasks page (opposite of before!)
    // 3. Has a valid role
    if (dismissedDate !== today && isOnTasksPage && role) {
      // Delay showing banner by 2 seconds after page load
      const timer = setTimeout(() => {
        setShowBanner(true)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isOnTasksPage, role])

  const handleDismiss = () => {
    setShowBanner(false)
    // Remember dismissal for today
    const today = new Date().toDateString()
    localStorage.setItem('taskReminderDismissed', today)
  }

  // Don't render if not showing or no role
  if (!showBanner || !role) {
    return null
  }

  return (
    <Fade in={showBanner}>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          top: 70, // Just below the top header
          right: 16,
          zIndex: 1250,
          backgroundColor: '#1976d2',
          color: 'white',
          borderRadius: 2,
          maxWidth: 300,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -10,
            right: 105, // Adjusted to point to clipboard icon (accounting for timer positions)
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: '10px solid #1976d2', // Arrow points UP
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '12px 16px',
            gap: 1
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight="600" sx={{ mb: 0.5 }}>
              👆 点击这里查看今天的任务和截止时间
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              不要忘记完成您的任务
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{
              color: 'white',
              padding: 0.5,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Paper>
    </Fade>
  )
}
