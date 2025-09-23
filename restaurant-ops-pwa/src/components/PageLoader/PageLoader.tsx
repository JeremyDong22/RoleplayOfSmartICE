// PageLoader Component v1.0
// Unified loading component for consistent loading UI across the application
// Created: 2025-01-24

import React from 'react'
import { Box, CircularProgress, Typography, Paper } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'

interface PageLoaderProps {
  message?: string
  subMessage?: string
  fullScreen?: boolean
  showPaper?: boolean
  size?: number
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = '加载中...',
  subMessage,
  fullScreen = true,
  showPaper = true,
  size = 60
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        p: showPaper ? 4 : 0,
        minHeight: fullScreen ? '100vh' : 'auto'
      }}
    >
      {/* 圆形加载框 - 与第一个加载保持一致 */}
      <Box
        sx={{
          position: 'relative',
          width: size + 20,
          height: size + 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* 背景圆圈 */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            bgcolor: 'background.paper',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CircularProgress
            size={size}
            thickness={3}
            sx={{
              color: 'primary.main'
            }}
          />
        </Box>
      </Box>

      {/* 加载文字 */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ fontWeight: 500 }}
        >
          {message}
        </Typography>
        {subMessage && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ mt: 1, display: 'block' }}
          >
            {subMessage}
          </Typography>
        )}
      </Box>
    </Box>
  )

  if (!showPaper) {
    return content
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: fullScreen ? '100vh' : 'auto'
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          {content}
        </Paper>
      </motion.div>
    </AnimatePresence>
  )
}

// 简化的内联加载器，用于小型加载状态
export const InlineLoader: React.FC<{ message?: string }> = ({ message = '加载中...' }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
      <CircularProgress size={20} thickness={3} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  )
}