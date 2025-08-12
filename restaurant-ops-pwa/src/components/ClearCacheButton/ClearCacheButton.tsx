// ClearCacheButton component - Force clear browser cache
// Created: 2025-08-04 - Added button to clear all browser cache and storage
// Updated: Hide on login and role selection pages
// Updated: 2025-08-08 - Removed useLocation dependency to work outside Router
// Updated: 2025-08-12 - Moved to top-right corner, added better refresh functionality
import { useState } from 'react'
import { IconButton, Tooltip, CircularProgress, Snackbar, Alert } from '@mui/material'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'

export const ClearCacheButton = () => {
  const [isClearing, setIsClearing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  
  // Check current path without using useLocation
  const currentPath = window.location.pathname
  const hiddenPaths = ['/', '/role-selection']
  if (hiddenPaths.includes(currentPath)) {
    return null
  }

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
      
      // Navigate to home and reload after 1.5 seconds
      setTimeout(() => {
        window.location.href = '/'
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
      <Tooltip title="强制清除浏览器缓存" placement="left">
        <IconButton
          onClick={handleClearCache}
          disabled={isClearing}
          sx={{
            position: 'fixed',
            top: 80, // Below navigation bar
            right: 16,
            backgroundColor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText',
            },
            zIndex: 1200, // Below dialogs but above content
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