// Component to handle PWA update notifications and version management
// Detects when new version is available and prompts user to update
// Updated: 2025-01-13 - Use complete cleanup for reliable updates

import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, Button, Box } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { cleanupAndReload } from '../utils/cacheCleanup';

interface UpdateNotificationProps {
  onVersionChange?: (version: string) => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onVersionChange }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false); // Track if we're in the middle of an update

  useEffect(() => {
    // Check for service worker updates
    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            setRegistration(reg);
            
            // Check for updates immediately
            await reg.update();
            
            // Get current version from service worker
            if (reg.active) {
              const messageChannel = new MessageChannel();
              messageChannel.port1.onmessage = (event) => {
                if (event.data?.version) {
                  setCurrentVersion(event.data.version);
                  onVersionChange?.(event.data.version);
                }
              };
              reg.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
            }
            
            // Listen for update found
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker is installed but waiting
                    setUpdateAvailable(true);
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      }
    };

    checkForUpdates();
    
    // Check for updates every 5 minutes in production, 30 seconds in dev
    const interval = setInterval(checkForUpdates, import.meta.env.DEV ? 30000 : 300000);
    
    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        // Service worker was updated and activated
        setCurrentVersion(event.data.version);
        onVersionChange?.(event.data.version);
        
        // Show notification that update was applied
        console.log('App updated to version:', event.data.version);
      }
    };
    
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    
    // Listen for controller change (happens after skipWaiting)
    const handleControllerChange = () => {
      // New service worker has taken control
      if (isUpdating) {
        // If we're updating because user clicked "立即更新", always reload
        console.log('[SW] Controller changed, reloading for user-initiated update');
        window.location.reload();
      } else if (!import.meta.env.DEV) {
        // In production, auto-reload for automatic updates
        window.location.reload();
      } else {
        // In development, show notification for automatic updates
        console.log('[SW] Controller changed, but skipping auto-reload in development');
        setUpdateAvailable(true);
      }
    };
    
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
    
    return () => {
      clearInterval(interval);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [onVersionChange]);

  const handleUpdate = async () => {
    // Mark that we're updating
    setIsUpdating(true);
    setUpdateAvailable(false);

    // Perform complete cleanup and reload - same as long-press refresh
    // This ensures 100% reliable updates by clearing all caches and storage
    await cleanupAndReload(1500);
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  return (
    <>
      <Snackbar
        open={updateAvailable}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={handleDismiss}
      >
        <Alert
          severity="info"
          variant="filled"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                size="small"
                onClick={handleDismiss}
              >
                稍后
              </Button>
              <Button
                color="inherit"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleUpdate}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  }
                }}
              >
                立即更新
              </Button>
            </Box>
          }
        >
          发现新版本，是否立即更新？
        </Alert>
      </Snackbar>
      
      {/* Debug info in development */}
      {import.meta.env.DEV && currentVersion && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 8,
            right: 8,
            padding: '4px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            fontSize: '10px',
            borderRadius: '4px',
            zIndex: 9999,
            fontFamily: 'monospace',
          }}
        >
          v: {currentVersion}
        </Box>
      )}
    </>
  );
};