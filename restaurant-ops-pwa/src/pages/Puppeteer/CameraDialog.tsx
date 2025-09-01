// Camera Dialog Component for Sample Management
// Reuses camera helper utilities for consistent camera behavior across the app

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  IconButton,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  Slider,
  Tooltip
} from '@mui/material'
import {
  Close as CloseIcon,
  CameraAlt,
  Refresh,
  FlipCameraAndroid,
  ZoomIn
} from '@mui/icons-material'
import {
  getCameraDevices,
  getOptimizedConstraints,
  applyZoom,
  getCameraLabel,
  initializeCamera,
  type CameraDevice
} from '../../utils/cameraHelper'
import {
  needsCompression,
  compressToSize,
  formatFileSize
} from '../../utils/imageCompressor'

interface CameraDialogProps {
  open: boolean
  onClose: () => void
  onCapture: (imageBlob: Blob) => void
  title?: string
}

export const CameraDialog: React.FC<CameraDialogProps> = ({
  open,
  onClose,
  onCapture,
  title = '拍照'
}) => {
  const [cameraError, setCameraError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [previewImage, setPreviewImage] = useState<string>('')
  const [isCompressing, setIsCompressing] = useState(false)
  
  // Camera selection and controls
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [cameraMenuAnchor, setCameraMenuAnchor] = useState<null | HTMLElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showZoomControl, setShowZoomControl] = useState(false)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Initialize camera
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setLoading(true)
      setCameraError(false)

      if (videoRef.current) {
        const stream = await initializeCamera(videoRef.current, deviceId)
        if (stream) {
          streamRef.current = stream
          setLoading(false)
        } else {
          throw new Error('Failed to initialize camera')
        }
      }
    } catch (error) {
      console.error('Camera initialization error:', error)
      setCameraError(true)
      setLoading(false)
    }
  }, [])

  // Load available cameras
  const loadCameras = useCallback(async () => {
    try {
      const cameras = await getCameraDevices()
      setAvailableCameras(cameras)
      
      // Select default camera
      const defaultCamera = cameras.find(cam => cam.isDefault) || cameras[0]
      if (defaultCamera) {
        setSelectedCameraId(defaultCamera.deviceId)
        await startCamera(defaultCamera.deviceId)
      } else {
        await startCamera()
      }
    } catch (error) {
      console.error('Failed to load cameras:', error)
      await startCamera()
    }
  }, [startCamera])

  // Initialize on mount
  useEffect(() => {
    if (open) {
      loadCameras()
    }
    
    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [open, loadCameras])

  // Handle camera switch
  const handleCameraSwitch = async (deviceId: string) => {
    setSelectedCameraId(deviceId)
    setCameraMenuAnchor(null)
    await startCamera(deviceId)
  }

  // Handle zoom change
  const handleZoomChange = async (newZoom: number) => {
    setZoomLevel(newZoom)
    if (streamRef.current) {
      await applyZoom(streamRef.current, newZoom)
    }
  }

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    setCapturing(true)
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Get image data
        canvas.toBlob(async (blob) => {
          if (blob) {
            // Check if compression is needed
            if (needsCompression(blob.size)) {
              setIsCompressing(true)
              try {
                const compressedBlob = await compressToSize(blob, 2 * 1024 * 1024) // 2MB target
                setPreviewImage(URL.createObjectURL(compressedBlob))
              } catch (error) {
                console.error('Compression failed:', error)
                setPreviewImage(URL.createObjectURL(blob))
              } finally {
                setIsCompressing(false)
              }
            } else {
              setPreviewImage(URL.createObjectURL(blob))
            }
          }
        }, 'image/jpeg', 0.9)
      }
    } catch (error) {
      console.error('Failed to capture photo:', error)
    } finally {
      setCapturing(false)
    }
  }, [])

  // Retake photo
  const retakePhoto = () => {
    setPreviewImage('')
  }

  // Confirm and save photo
  const confirmPhoto = async () => {
    if (!canvasRef.current) return

    canvasRef.current.toBlob(async (blob) => {
      if (blob) {
        // Compress if needed before saving
        let finalBlob = blob
        if (needsCompression(blob.size)) {
          setIsCompressing(true)
          try {
            finalBlob = await compressToSize(blob, 2 * 1024 * 1024)
          } catch (error) {
            console.error('Compression failed:', error)
          } finally {
            setIsCompressing(false)
          }
        }
        
        onCapture(finalBlob)
        handleClose()
      }
    }, 'image/jpeg', 0.9)
  }

  // Handle dialog close
  const handleClose = () => {
    // Cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setPreviewImage('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '60vh',
            backgroundColor: '#000',
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {loading && (
            <CircularProgress color="primary" />
          )}

          {cameraError && (
            <Alert severity="error" sx={{ m: 2 }}>
              无法访问摄像头，请检查权限设置
            </Alert>
          )}

          {!loading && !cameraError && !previewImage && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
              
              {/* Camera controls */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  display: 'flex',
                  gap: 1
                }}
              >
                {/* Camera switch button */}
                {availableCameras.length > 1 && (
                  <Tooltip title="切换摄像头">
                    <IconButton
                      onClick={(e) => setCameraMenuAnchor(e.currentTarget)}
                      sx={{
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.7)'
                        }
                      }}
                    >
                      <FlipCameraAndroid />
                    </IconButton>
                  </Tooltip>
                )}

                {/* Zoom control */}
                <Tooltip title="缩放">
                  <IconButton
                    onClick={() => setShowZoomControl(!showZoomControl)}
                    sx={{
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.7)'
                      }
                    }}
                  >
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Zoom slider */}
              {showZoomControl && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '200px',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    p: 2,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'white' }}>
                    缩放: {zoomLevel.toFixed(1)}x
                  </Typography>
                  <Slider
                    value={zoomLevel}
                    onChange={(_, value) => handleZoomChange(value as number)}
                    min={1}
                    max={3}
                    step={0.1}
                    sx={{ color: 'white' }}
                  />
                </Box>
              )}
            </>
          )}

          {/* Preview image */}
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Box>

        {/* Camera menu */}
        <Menu
          anchorEl={cameraMenuAnchor}
          open={Boolean(cameraMenuAnchor)}
          onClose={() => setCameraMenuAnchor(null)}
        >
          {availableCameras.map((camera, index) => (
            <MenuItem
              key={camera.deviceId}
              onClick={() => handleCameraSwitch(camera.deviceId)}
              selected={camera.deviceId === selectedCameraId}
            >
              {getCameraLabel(camera, index)}
            </MenuItem>
          ))}
        </Menu>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {!previewImage ? (
          <Button
            variant="contained"
            size="large"
            startIcon={capturing ? <CircularProgress size={20} /> : <CameraAlt />}
            onClick={capturePhoto}
            disabled={loading || cameraError || capturing}
            fullWidth
          >
            {capturing ? '拍照中...' : '拍照'}
          </Button>
        ) : (
          <Box display="flex" gap={2} width="100%">
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={retakePhoto}
              fullWidth
            >
              重拍
            </Button>
            <Button
              variant="contained"
              onClick={confirmPhoto}
              disabled={isCompressing}
              fullWidth
            >
              {isCompressing ? '压缩中...' : '使用照片'}
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  )
}