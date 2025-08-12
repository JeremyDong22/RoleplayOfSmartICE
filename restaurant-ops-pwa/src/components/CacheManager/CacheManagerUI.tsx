/**
 * 缓存管理器UI组件
 * Created: 2025-08-03
 * Updated: 2025-08-12 - Removed DEV badge, kept development mode only functionality
 * 仅在开发模式下显示，提供手动清理缓存的功能
 */

import { useState } from 'react'
import { IconButton, Tooltip, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material'
import CachedIcon from '@mui/icons-material/Cached'
import DeleteIcon from '@mui/icons-material/Delete'
import { clearAllCaches, APP_VERSION } from '../../utils/cacheManager'

export const CacheManagerUI = () => {
  const [open, setOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  
  // 仅在开发模式下显示
  if (!import.meta.env.DEV) {
    return null
  }
  
  const handleClearCache = async () => {
    setClearing(true)
    try {
      await clearAllCaches()
      // 延迟一下让用户看到清理完成的状态
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('Failed to clear cache:', error)
      setClearing(false)
    }
  }
  
  return (
    <>
      <Tooltip title="缓存管理（开发模式）">
        <IconButton 
          onClick={() => setOpen(true)}
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            left: 20,
            backgroundColor: 'background.paper',
            boxShadow: 2,
            zIndex: 9999, // 最高层级，不会被任何元素覆盖
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <CachedIcon />
        </IconButton>
      </Tooltip>
      
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>缓存管理器（开发模式）</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" gutterBottom>
              当前版本：<strong>{APP_VERSION}</strong>
            </Typography>
            <Typography variant="body2" gutterBottom>
              缓存状态：{localStorage.getItem('app_version') === APP_VERSION ? '已更新' : '需要更新'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              在开发模式下，每次页面加载时会自动清理缓存。
            </Typography>
            <Typography variant="body2" color="text.secondary">
              你也可以手动清理所有缓存并刷新页面。
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button 
            onClick={handleClearCache} 
            color="error" 
            variant="contained"
            disabled={clearing}
            startIcon={<DeleteIcon />}
          >
            {clearing ? '清理中...' : '清理缓存并刷新'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}