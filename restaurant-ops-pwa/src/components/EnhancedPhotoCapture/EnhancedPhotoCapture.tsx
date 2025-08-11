// Enhanced Photo Capture component with sample selection and batch management
// Changes made:
// 1. Integrated sample selector in Information Container area
// 2. Changed "提交" to "保存" for individual photos
// 3. Added photo management drawer for viewing/editing all photos
// 4. Batch submission of all photos at once
// 5. Added Huawei device compatibility fixes
// 6. Integrated image compression for better upload performance
// 7. Added camera selection and zoom controls

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  IconButton,
  Button,
  Typography,
  Paper,
  Alert,
  Snackbar,
  Badge,
  Fab,
  CircularProgress,
  TextField,
  Menu,
  MenuItem,
  Slider,
  Tooltip
} from '@mui/material'
import {
  Close as CloseIcon,
  CameraAlt,
  Refresh,
  CloudUpload,
  PhotoLibrary,
  Save as SaveIcon,
  CameraSwitch,
  ZoomIn,
  Settings
} from '@mui/icons-material'
import { SampleSelector } from './SampleSelector'
import { PhotoManagementDrawer } from './PhotoManagementDrawer'
import type { EnhancedPhotoCaptureProps, Sample, CapturedPhoto, PhotoSession } from './types'
import { v4 as uuidv4 } from 'uuid'
import {
  getCameraDevices,
  getOptimizedConstraints,
  initializeCamera,
  applyZoom,
  isHuaweiDevice,
  isIPadDevice,
  getCameraLabel,
  type CameraDevice
} from '../../utils/cameraHelper'
import {
  compressImage,
  needsCompression,
  compressToSize,
  formatFileSize,
  estimateFileSize
} from '../../utils/imageCompressor'

export const EnhancedPhotoCapture: React.FC<EnhancedPhotoCaptureProps> = ({
  open,
  taskName,
  taskId,
  isFloatingTask = false,
  onClose,
  onSubmit,
  onSave,
  existingSession
}) => {
  // State management
  const [samples, setSamples] = useState<Sample[]>([])
  const [currentSampleId, setCurrentSampleId] = useState<string>('')
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>(
    existingSession?.photos || []
  )
  const [currentPhoto, setCurrentPhoto] = useState('')
  const [currentDescription, setCurrentDescription] = useState('')
  const [cameraError, setCameraError] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showPhotoDrawer, setShowPhotoDrawer] = useState(false)
  // const [isCapturing, setIsCapturing] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Camera selection and controls
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [cameraMenuAnchor, setCameraMenuAnchor] = useState<null | HTMLElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showZoomControl, setShowZoomControl] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Get sample directory path
  const getSampleDir = useCallback((name: string): string => {
    if (isFloatingTask) {
      return `后厨特殊任务/${name}`
    }
    
    const cleanName = name.replace(' - 拍照', '').replace(' - 录音', '')
    const roleMatch = cleanName.match(/^(前厅|后厨|值班经理)\s*-\s*/)
    let role = roleMatch ? roleMatch[1] : '前厅'
    const taskName = roleMatch ? cleanName.replace(roleMatch[0], '') : cleanName
    
    if (taskId?.includes('duty-manager')) {
      role = '值班经理'
    }
    
    const chefTasks = ['食品安全检查', '开始巡店验收', '巡店验收', '收市清洁检查', '收市准备', '食材下单']
    if (!roleMatch && chefTasks.includes(taskName)) {
      role = '后厨'
    }
    
    const taskFolderMap: { [key: string]: { [key: string]: string } } = {
      '值班经理': {
        '滞留客人的餐后清洁': '4-餐后收市午市-滞留客人的餐后清洁',
        '员工餐后清洁': '4-餐后收市午市-员工餐后清洁',
        '营业款核对': '4-餐后收市午市-营业款核对',
        '能源管理': '4-餐后收市午市-能源管理',
        '能源安全检查': '8-闭店-能源安全检查',
        '安防闭店检查': '8-闭店-安防闭店检查'
      }
    }
    
    if (role === '值班经理' && taskFolderMap[role]?.[taskName]) {
      return `${role}/${taskFolderMap[role][taskName]}`
    }
    
    return `${role}/${taskName}`
  }, [isFloatingTask, taskId])

  // Load samples
  useEffect(() => {
    if (open && taskName) {
      setLoading(true)
      const sampleDir = getSampleDir(taskName)
      const loadedSamples: Sample[] = []
      
      const checkSamples = async () => {
        let sampleIndex = 1
        let foundSamples = true
        
        while (foundSamples && sampleIndex <= 10) {
          const sample: Sample = { 
            id: `sample-${sampleIndex}`,
            images: [], 
            text: '' 
          }
          let hasContent = false
          
          try {
            const textPath = `/task-samples/${sampleDir}/sample${sampleIndex}.txt`
            const textResponse = await fetch(textPath)
            if (textResponse.ok) {
              const textContent = await textResponse.text()
              if (!textContent.includes('<!doctype html>')) {
                sample.text = textContent
                hasContent = true
              }
            }
          } catch {
            // Silent fail - expected for missing files
          }
          
          let imgIdx = 1
          let foundImage = true
          while (foundImage && imgIdx <= 50) {
            try {
              let imagePath = ''
              if (imgIdx === 1) {
                const path1 = `/task-samples/${sampleDir}/sample${sampleIndex}.jpg`
                const response = await fetch(path1)
                if (response.ok && response.headers.get('content-type')?.includes('image')) {
                  imagePath = path1
                } else {
                  const path2 = `/task-samples/${sampleDir}/sample${sampleIndex}-1.jpg`
                  const response2 = await fetch(path2)
                  if (response2.ok && response2.headers.get('content-type')?.includes('image')) {
                    imagePath = path2
                  }
                }
              } else {
                const path = `/task-samples/${sampleDir}/sample${sampleIndex}-${imgIdx}.jpg`
                const response = await fetch(path)
                if (response.ok && response.headers.get('content-type')?.includes('image')) {
                  imagePath = path
                }
              }
              
              if (imagePath) {
                sample.images.push(imagePath)
                hasContent = true
                imgIdx++
              } else {
                foundImage = false
              }
            } catch {
              foundImage = false
            }
            
            if (imgIdx > 50) {
              foundImage = false
            }
          }
          
          if (hasContent) {
            loadedSamples.push(sample)
            sampleIndex++
          } else {
            foundSamples = false
          }
        }
        
        setSamples(loadedSamples)
        if (loadedSamples.length > 0) {
          setCurrentSampleId(loadedSamples[0].id)
        }
        setLoading(false)
      }
      
      checkSamples()
    }
  }, [open, taskName, isFloatingTask, taskId, getSampleDir])

  // Load available cameras
  useEffect(() => {
    const loadCameras = async () => {
      const cameras = await getCameraDevices()
      setAvailableCameras(cameras)
      
      // Select default camera
      const defaultCamera = cameras.find(cam => cam.isDefault) || cameras[0]
      if (defaultCamera) {
        setSelectedCameraId(defaultCamera.deviceId)
      }
    }
    
    loadCameras()
  }, [])

  // Camera management
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setCameraError(false)
      stopCamera()
      
      // Use optimized constraints for the device
      const constraints = await getOptimizedConstraints(selectedCameraId || undefined)
      
      console.log('Starting camera with constraints:', constraints)
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            console.error('Failed to play video:', e)
            setCameraError(true)
          })
        }
        
        // Apply initial zoom for Huawei devices
        if (isHuaweiDevice()) {
          setTimeout(() => {
            if (streamRef.current) {
              applyZoom(streamRef.current, 1)
              setZoomLevel(1)
            }
          }, 500)
        }
      }
    } catch (error) {
      console.error('Failed to start camera:', error)
      setCameraError(true)
    }
  }, [stopCamera, selectedCameraId])

  // Start camera when dialog opens
  useEffect(() => {
    if (open && !loading) {
      const timer = setTimeout(() => {
        startCamera()
      }, 300)
      
      return () => {
        clearTimeout(timer)
        stopCamera()
      }
    }
    
    if (!open) {
      stopCamera()
    }
  }, [open, loading, startCamera, stopCamera])

  // Capture photo with compression
  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
      // setIsCapturing(true)
      const video = videoRef.current
      const canvas = canvasRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(video, 0, 0)
        
        let photoData = canvas.toDataURL('image/jpeg', 0.9)
        
        // Compress if needed
        if (needsCompression(photoData, 800)) {
          setIsCompressing(true)
          try {
            photoData = await compressToSize(photoData, 800, 0.5)
            console.log('Photo compressed:', formatFileSize(estimateFileSize(photoData)))
          } catch (error) {
            console.error('Compression failed:', error)
          } finally {
            setIsCompressing(false)
          }
        }
        
        setCurrentPhoto(photoData)
        
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        setTimeout(() => {
          // setIsCapturing(false)
        }, 300)
      }
    }
  }
  
  // Handle camera switch
  const handleCameraSwitch = (cameraId: string) => {
    setSelectedCameraId(cameraId)
    setCameraMenuAnchor(null)
    // Camera will restart automatically due to useEffect dependency
  }
  
  // Handle zoom change
  const handleZoomChange = async (event: Event, value: number | number[]) => {
    const zoom = value as number
    setZoomLevel(zoom)
    
    if (streamRef.current) {
      await applyZoom(streamRef.current, zoom)
    }
  }

  // Save current photo
  const saveCurrentPhoto = () => {
    if (currentPhoto && currentSampleId) {
      const currentSample = samples.find(s => s.id === currentSampleId)
      const newPhoto: CapturedPhoto = {
        id: uuidv4(),
        photoData: currentPhoto,
        sampleId: currentSampleId,
        sampleName: currentSample?.text || `Sample ${samples.findIndex(s => s.id === currentSampleId) + 1}`,
        timestamp: Date.now(),
        description: currentDescription
      }
      
      setCapturedPhotos([...capturedPhotos, newPhoto])
      setCurrentPhoto('')
      setCurrentDescription('')
      setShowSuccess(true)
      
      // Save session if callback provided
      if (onSave) {
        const session: PhotoSession = {
          taskId,
          taskName,
          photos: [...capturedPhotos, newPhoto],
          startTime: existingSession?.startTime || Date.now(),
          lastModified: Date.now()
        }
        onSave(session)
      }
    }
  }

  // Retake photo
  const retakePhoto = () => {
    setCurrentPhoto('')
    setCurrentDescription('')
  }

  // Delete photo
  const deletePhoto = (photoId: string) => {
    const newPhotos = capturedPhotos.filter(p => p.id !== photoId)
    setCapturedPhotos(newPhotos)
    
    // Update session
    if (onSave) {
      const session: PhotoSession = {
        taskId,
        taskName,
        photos: newPhotos,
        startTime: existingSession?.startTime || Date.now(),
        lastModified: Date.now()
      }
      onSave(session)
    }
  }

  // Submit all photos
  const handleSubmitAll = () => {
    onSubmit(capturedPhotos)
    setCapturedPhotos([])
    setCurrentPhoto('')
    setCurrentDescription('')
    setCurrentSampleId(samples[0]?.id || '')
    setCameraError(false)
    setShowPhotoDrawer(false)
  }

  // Handle close
  const handleClose = () => {
    stopCamera()
    onClose()
  }

  if (!open) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        bgcolor: 'black',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Bar */}
      <Paper
        sx={{
          bgcolor: 'rgba(0,0,0,0.7)',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="h6" color="white">
          {taskName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Camera Switch Button (show if multiple cameras) */}
          {availableCameras.length > 1 && (
            <Tooltip title="切换摄像头">
              <IconButton
                onClick={(e) => setCameraMenuAnchor(e.currentTarget)}
                sx={{ color: 'white' }}
              >
                <CameraSwitch />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Zoom Control Button */}
          {!cameraError && (
            <Tooltip title="调整缩放">
              <IconButton
                onClick={() => setShowZoomControl(!showZoomControl)}
                sx={{ color: 'white' }}
              >
                <ZoomIn />
              </IconButton>
            </Tooltip>
          )}
          
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Paper>
      
      {/* Camera Selection Menu */}
      <Menu
        anchorEl={cameraMenuAnchor}
        open={Boolean(cameraMenuAnchor)}
        onClose={() => setCameraMenuAnchor(null)}
      >
        {availableCameras.map((camera, index) => (
          <MenuItem
            key={camera.deviceId}
            selected={camera.deviceId === selectedCameraId}
            onClick={() => handleCameraSwitch(camera.deviceId)}
          >
            {getCameraLabel(camera, index)}
            {camera.isDefault && ' (推荐)'}
          </MenuItem>
        ))}
      </Menu>

      {/* Camera View */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Zoom Control Slider */}
        {showZoomControl && !cameraError && !currentPhoto && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              bgcolor: 'rgba(0,0,0,0.6)',
              borderRadius: 2,
              p: 2,
              minWidth: 200
            }}
          >
            <Typography variant="caption" color="white" gutterBottom>
              缩放: {zoomLevel.toFixed(1)}x
            </Typography>
            <Slider
              value={zoomLevel}
              onChange={handleZoomChange}
              min={1}
              max={3}
              step={0.1}
              marks={[
                { value: 1, label: '1x' },
                { value: 2, label: '2x' },
                { value: 3, label: '3x' }
              ]}
              sx={{
                color: 'white',
                '& .MuiSlider-markLabel': {
                  color: 'white'
                }
              }}
            />
          </Box>
        )}
        {loading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CircularProgress />
          </Box>
        ) : cameraError ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
              color: 'white'
            }}
          >
            <Alert severity="error" sx={{ mb: 2 }}>
              相机启动失败，请检查权限设置
            </Alert>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={() => startCamera()}
            >
              重试
            </Button>
          </Box>
        ) : currentPhoto ? (
          <Box
            component="img"
            src={currentPhoto}
            alt="Captured"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: isIPadDevice() ? 'contain' : 'cover',
                backgroundColor: '#000'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
          </>
        )}
      </Box>

      {/* Information Container - Sample Selector */}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        {samples.length > 0 && (
          <SampleSelector
            samples={samples}
            currentSampleId={currentSampleId}
            onSampleChange={setCurrentSampleId}
            capturedPhotos={capturedPhotos}
          />
        )}
      </Box>

      {/* Photo Description (when photo is captured) */}
      {currentPhoto && (
        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            label="照片说明（可选）"
            value={currentDescription}
            onChange={(e) => setCurrentDescription(e.target.value)}
            size="small"
          />
        </Box>
      )}

      {/* Bottom Controls */}
      <Paper
        sx={{
          bgcolor: 'rgba(0,0,0,0.8)',
          p: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Photo Count Badge */}
          <Badge badgeContent={capturedPhotos.length} color="primary">
            <Button
              variant="outlined"
              startIcon={<PhotoLibrary />}
              onClick={() => setShowPhotoDrawer(true)}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              查看照片
            </Button>
          </Badge>

          {/* Capture/Save Buttons */}
          {currentPhoto ? (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={retakePhoto}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                重拍
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={saveCurrentPhoto}
              >
                保存
              </Button>
            </Box>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <Fab
                color="primary"
                size="large"
                onClick={capturePhoto}
                disabled={cameraError || loading || isCompressing}
              >
                {isCompressing ? <CircularProgress size={24} /> : <CameraAlt />}
              </Fab>
              {isCompressing && (
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    bottom: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
                    whiteSpace: 'nowrap'
                  }}
                >
                  压缩中...
                </Typography>
              )}
            </Box>
          )}

          {/* Submit All Button */}
          <Button
            variant="contained"
            color="success"
            startIcon={<CloudUpload />}
            onClick={handleSubmitAll}
            disabled={capturedPhotos.length === 0}
          >
            提交 ({capturedPhotos.length})
          </Button>
        </Box>
      </Paper>

      {/* Photo Management Drawer */}
      <PhotoManagementDrawer
        open={showPhotoDrawer}
        photos={capturedPhotos}
        samples={samples}
        onClose={() => setShowPhotoDrawer(false)}
        onDeletePhoto={deletePhoto}
        onRetakePhoto={() => {
          // TODO: Implement retake functionality
          setShowPhotoDrawer(false)
        }}
        onSubmitAll={handleSubmitAll}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        message="照片已保存"
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
      
      {/* Device Info (Debug - show on Huawei and iPad) */}
      {(isHuaweiDevice() || isIPadDevice()) && process.env.NODE_ENV === 'development' && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 100,
            left: 10,
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
            p: 1,
            borderRadius: 1,
            fontSize: '10px'
          }}
        >
          {isHuaweiDevice() && (
            <Typography variant="caption" display="block">
              华为设备检测: 已启用兼容模式
            </Typography>
          )}
          {isIPadDevice() && (
            <Typography variant="caption" display="block">
              iPad设备检测: 已优化视频显示
            </Typography>
          )}
          <Typography variant="caption" display="block">
            摄像头数量: {availableCameras.length}
          </Typography>
          <Typography variant="caption" display="block">
            视频模式: {isIPadDevice() ? 'contain' : 'cover'}
          </Typography>
        </Box>
      )}
    </Box>
  )
}