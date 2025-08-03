// ClearCacheButton component - Force clear browser cache
// Created: 2025-08-04 - Added button to clear all browser cache and storage
import { useState } from 'react'
import { IconButton, Tooltip, CircularProgress, Snackbar, Alert } from '@mui/material'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'

export const ClearCacheButton = () => {
  const [isClearing, setIsClearing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)

  const handleClearCache = async () => {
    setIsClearing(true)
    
    try {
      // Clear localStorage
      localStorage.clear()
      
      // Clear sessionStorage
      sessionStorage.clear()
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases?.() || []
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        }
      }
      
      // Clear cookies for current domain
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
      
      // Clear cache storage if available
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
      }
      
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
      }
      
      setShowSuccess(true)
      
      // Reload page after 1.5 seconds
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (error) {
      console.error('Error clearing cache:', error)
      setShowError(true)
      setIsClearing(false)
    }
  }
  
  return (
    <>
      <Tooltip title="强制清除浏览器缓存" placement="right">
        <IconButton
          onClick={handleClearCache}
          disabled={isClearing}
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            backgroundColor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText',
            },
            zIndex: 9999,
          }}
        >
          {isClearing ? (
            <CircularProgress size={24} />
          ) : (
            <DeleteSweepIcon />
          )}
        </IconButton>
      </Tooltip>
      
      <Snackbar
        open={showSuccess}
        autoHideDuration={1500}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setShowSuccess(false)}>
          缓存已清除，页面即将刷新...
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={showError}
        autoHideDuration={3000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setShowError(false)}>
          清除缓存时出错，请重试
        </Alert>
      </Snackbar>
    </>
  )
}