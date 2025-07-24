// Floating Camera View Component with draggable sample window
// Changes made:
// 1. Full-screen camera view with floating sample window
// 2. Draggable and resizable sample window
// 3. Support for multiple sample images with navigation
// 4. Captured photos preview at bottom
// 5. Improved touch interactions for mobile

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  IconButton,
  Button,
  Typography,
  Paper,
  // Chip,
  Alert,
  Snackbar,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  // Divider,
  Fab,
  // Zoom,
  // Slide,
  Fade
} from '@mui/material'
import {
  Close as CloseIcon,
  CameraAlt,
  // Check,
  Refresh,
  CloudUpload,
  // Visibility,
  ZoomIn,
  ZoomOut,
  DragIndicator,
  NavigateBefore,
  NavigateNext,
  Delete,
  PhotoLibrary,
  ViewModule,
  ExpandLess,
  // ExpandMore
} from '@mui/icons-material'
import { useDrag } from '@use-gesture/react'
import { animated, useSpring } from '@react-spring/web'

interface Evidence {
  photo: string
  description: string
  sampleIndex: number
  timestamp: number
}

interface Sample {
  images: string[]
  text: string
}

interface FloatingCameraViewProps {
  open: boolean
  taskName: string
  taskId: string
  isFloatingTask?: boolean
  onClose: () => void
  onSubmit: (evidence: Evidence[]) => void
}

// Animated components
const AnimatedPaper = animated(Paper)

export const FloatingCameraView: React.FC<FloatingCameraViewProps> = ({
  open,
  taskName,
  taskId,
  isFloatingTask = false,
  onClose,
  onSubmit
}) => {
  // State management
  const [capturedEvidence, setCapturedEvidence] = useState<Evidence[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [cameraError, setCameraError] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showPhotoDrawer, setShowPhotoDrawer] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  
  // Floating window state
  const [windowSize, setWindowSize] = useState({ width: 200, height: 150 })
  const [windowMinimized, setWindowMinimized] = useState(false)
  const [windowPosition, setWindowPosition] = useState({ x: 20, y: 20 })
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Spring animation for floating window
  const [springProps, springApi] = useSpring(() => ({
    x: windowPosition.x,
    y: windowPosition.y,
    scale: 1,
    config: { tension: 200, friction: 25 }
  }))

  // Load samples (reuse logic from PhotoSubmissionDialog)
  const getSampleDir = (name: string): string => {
    if (isFloatingTask) {
      return `后厨特殊任务/${name}`
    }
    
    const cleanName = name.replace(' - 拍照', '').replace(' - 录音', '')
    const roleMatch = cleanName.match(/^(前厅|后厨|值班经理)\s*-\s*/)
    let role = roleMatch ? roleMatch[1] : '前厅'
    const taskName = roleMatch ? cleanName.replace(roleMatch[0], '') : cleanName
    
    // Check if this is a duty manager task based on task ID
    if (taskId?.includes('duty-manager')) {
      role = '值班经理'
    }
    
    const chefTasks = ['食品安全检查', '开始巡店验收', '巡店验收', '收市清洁检查', '收市准备', '食材下单']
    if (!roleMatch && chefTasks.includes(taskName)) {
      role = '后厨'
    }
    
    // Map task names to new folder structure
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
    
    // Look up the new folder name for duty manager tasks
    if (role === '值班经理' && taskFolderMap[role]?.[taskName]) {
      return `${role}/${taskFolderMap[role][taskName]}`
    }
    
    return `${role}/${taskName}`
  }

  // Camera management functions
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
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 }
        } 
      })
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            console.error('Failed to play video:', e)
            setCameraError(true)
          })
        }
      }
    } catch (error) {
      console.error('Failed to start camera:', error)
      setCameraError(true)
    }
  }, [stopCamera])

  // Load samples effect
  useEffect(() => {
    if (open && taskName) {
      const sampleDir = getSampleDir(taskName)
      const loadedSamples: Sample[] = []
      
      const checkSamples = async () => {
        let sampleIndex = 1
        let foundSamples = true
        
        while (foundSamples && sampleIndex <= 20) {
          const sample: Sample = { images: [], text: '' }
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
          } catch (err) {
            // Silent fail
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
          }
          
          if (hasContent) {
            loadedSamples.push(sample)
            sampleIndex++
          } else {
            foundSamples = false
          }
        }
        
        setSamples(loadedSamples)
      }
      
      checkSamples()
    }
  }, [open, taskName, isFloatingTask])

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
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
  }, [open, startCamera, stopCamera])

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
      setIsCapturing(true)
      const video = videoRef.current
      const canvas = canvasRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(video, 0, 0)
        
        const photoData = canvas.toDataURL('image/jpeg', 0.8)
        
        setCapturedEvidence([...capturedEvidence, {
          photo: photoData,
          description: '',
          sampleIndex: currentSampleIndex,
          timestamp: Date.now()
        }])
        
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setShowSuccess(true)
        
        // Brief capture animation
        setTimeout(() => {
          setIsCapturing(false)
        }, 300)
      }
    }
  }

  // Delete photo
  const deletePhoto = (index: number) => {
    setCapturedEvidence(capturedEvidence.filter((_, i) => i !== index))
  }

  // Submit photos
  const handleSubmit = () => {
    onSubmit(capturedEvidence)
    setCapturedEvidence([])
    setCurrentSampleIndex(0)
    setCurrentImageIndex(0)
    setCameraError(false)
  }

  // Handle close
  const handleClose = () => {
    stopCamera()
    onClose()
  }

  // Drag handlers for floating window
  const bind = useDrag(({ offset: [x, y], down }) => {
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect()
      const maxX = bounds.width - windowSize.width
      const maxY = bounds.height - windowSize.height
      
      const newX = Math.max(0, Math.min(x, maxX))
      const newY = Math.max(0, Math.min(y, maxY))
      
      springApi.start({
        x: newX,
        y: newY,
        scale: down ? 1.05 : 1,
        immediate: down
      })
      
      if (!down) {
        setWindowPosition({ x: newX, y: newY })
      }
    }
  }, {
    from: () => [windowPosition.x, windowPosition.y]
  })

  // Window resize handlers
  const handleWindowResize = (action: 'increase' | 'decrease') => {
    setWindowSize(prev => {
      const factor = action === 'increase' ? 1.2 : 0.8
      return {
        width: Math.max(150, Math.min(400, prev.width * factor)),
        height: Math.max(100, Math.min(300, prev.height * factor))
      }
    })
  }

  // Navigate samples
  const navigateSample = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentImageIndex > 0) {
        setCurrentImageIndex(currentImageIndex - 1)
      } else if (currentSampleIndex > 0) {
        setCurrentSampleIndex(currentSampleIndex - 1)
        setCurrentImageIndex(samples[currentSampleIndex - 1]?.images.length - 1 || 0)
      }
    } else {
      const currentSample = samples[currentSampleIndex]
      if (currentSample && currentImageIndex < currentSample.images.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1)
      } else if (currentSampleIndex < samples.length - 1) {
        setCurrentSampleIndex(currentSampleIndex + 1)
        setCurrentImageIndex(0)
      }
    }
  }

  if (!open) return null

  const currentSample = samples[currentSampleIndex]
  const currentImage = currentSample?.images[currentImageIndex]

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        bgcolor: 'black'
      }}
    >
      {/* Camera View */}
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        {cameraError ? (
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
                objectFit: 'cover'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            
            {/* Flash effect */}
            <Fade in={isCapturing} timeout={200}>
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'white',
                  opacity: 0.8,
                  pointerEvents: 'none'
                }}
              />
            </Fade>
          </>
        )}
      </Box>

      {/* Top Controls */}
      <Paper
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
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
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Paper>

      {/* Floating Sample Window */}
      {samples.length > 0 && !windowMinimized && (
        <AnimatedPaper
          {...bind()}
          style={{
            position: 'absolute',
            left: springProps.x,
            top: springProps.y,
            transform: springProps.scale.to(s => `scale(${s})`),
            width: windowSize.width,
            height: windowSize.height,
            cursor: 'move',
            touchAction: 'none',
            userSelect: 'none'
          }}
          elevation={8}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Window Header */}
            <Box
              sx={{
                bgcolor: 'primary.dark',
                color: 'white',
                p: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DragIndicator fontSize="small" />
                <Typography variant="caption">
                  示例 {currentSampleIndex + 1}/{samples.length}
                </Typography>
              </Box>
              <Box>
                <IconButton size="small" onClick={() => handleWindowResize('decrease')} sx={{ color: 'white', p: 0.5 }}>
                  <ZoomOut fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleWindowResize('increase')} sx={{ color: 'white', p: 0.5 }}>
                  <ZoomIn fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setWindowMinimized(true)} sx={{ color: 'white', p: 0.5 }}>
                  <ExpandLess fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Sample Content */}
            <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {currentImage && (
                <Box
                  component="img"
                  src={currentImage}
                  alt={`Sample ${currentSampleIndex + 1}-${currentImageIndex + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              )}
              
              {/* Navigation */}
              {(samples.length > 1 || (currentSample && currentSample.images.length > 1)) && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => navigateSample('prev')}
                    disabled={currentSampleIndex === 0 && currentImageIndex === 0}
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                    }}
                  >
                    <NavigateBefore />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => navigateSample('next')}
                    disabled={
                      currentSampleIndex === samples.length - 1 &&
                      currentImageIndex === (currentSample?.images.length || 1) - 1
                    }
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                    }}
                  >
                    <NavigateNext />
                  </IconButton>
                </>
              )}
            </Box>

            {/* Sample Description */}
            {currentSample?.text && (
              <Box sx={{ p: 1, bgcolor: 'grey.100' }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                  {currentSample.text}
                </Typography>
              </Box>
            )}
          </Box>
        </AnimatedPaper>
      )}

      {/* Minimized Sample Button */}
      {windowMinimized && (
        <Fab
          size="small"
          color="primary"
          onClick={() => setWindowMinimized(false)}
          sx={{
            position: 'absolute',
            left: 20,
            top: 80
          }}
        >
          <ViewModule />
        </Fab>
      )}

      {/* Bottom Controls */}
      <Paper
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'rgba(0,0,0,0.8)',
          p: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          {/* Photos Badge */}
          <Badge badgeContent={capturedEvidence.length} color="primary">
            <Button
              variant="outlined"
              startIcon={<PhotoLibrary />}
              onClick={() => setShowPhotoDrawer(true)}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              已拍摄
            </Button>
          </Badge>

          {/* Capture Button */}
          <Fab
            color="primary"
            size="large"
            onClick={capturePhoto}
            disabled={cameraError}
          >
            <CameraAlt />
          </Fab>

          {/* Submit Button */}
          <Button
            variant="contained"
            color="success"
            startIcon={<CloudUpload />}
            onClick={handleSubmit}
            disabled={capturedEvidence.length === 0}
          >
            提交 ({capturedEvidence.length})
          </Button>
        </Box>
      </Paper>

      {/* Photo Drawer */}
      <Drawer
        anchor="bottom"
        open={showPhotoDrawer}
        onClose={() => setShowPhotoDrawer(false)}
        PaperProps={{
          sx: { maxHeight: '50vh' }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            已拍摄照片 ({capturedEvidence.length})
          </Typography>
          <List>
            {capturedEvidence.map((evidence, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton edge="end" onClick={() => deletePhoto(index)}>
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  <Box
                    component="img"
                    src={evidence.photo}
                    alt={`Photo ${index + 1}`}
                    sx={{
                      width: 60,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: 1
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={`照片 ${index + 1}`}
                  secondary={new Date(evidence.timestamp).toLocaleTimeString()}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        message="照片已保存"
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </Box>
  )
}