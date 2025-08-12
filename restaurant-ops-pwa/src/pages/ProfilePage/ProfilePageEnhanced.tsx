// Enhanced Profile page with intelligent face enrollment and testing
// Features simplified multi-shot capture for better reliability
// Fixed: Removed unreliable angle detection, now uses quality-based capture
// Updated: Added bottom NavigationBar for navigation between tasks, profile, and notifications

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  Stack,
  IconButton,
  Paper,
  useMediaQuery,
  useTheme
} from '@mui/material'
import {
  Person,
  Face,
  CameraAlt,
  CheckCircle,
  Error as ErrorIcon,
  Close,
  Refresh,
  Security,
  Delete,
  Science,
  Check,
  Clear,
  PhotoCamera,
  CloudUpload
} from '@mui/icons-material'
import { authService } from '../../services/authService'
import { faceDetectionService, type FaceDetectionResult } from '../../services/faceDetectionService'
import { NavigationBar } from '../../components/Navigation/NavigationBar'
import { supabase } from '../../services/supabase'

// Smart Face Enrollment Dialog with 9-angle capture
const SmartFaceEnrollmentDialog: React.FC<{
  open: boolean
  onClose: () => void
  onSuccess: () => void
}> = ({ open, onClose, onSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  
  const [stage, setStage] = useState<'idle' | 'ready' | 'processing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([])
  const [capturedDescriptors, setCapturedDescriptors] = useState<Float32Array[]>([])
  const [currentQuality, setCurrentQuality] = useState(0)
  const [detectionMessage, setDetectionMessage] = useState('准备开始')
  const [uploadStatus, setUploadStatus] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0)
  const [faceDetected, setFaceDetected] = useState(false)
  
  const REQUIRED_PHOTOS = 9 // 9 different angles
  
  // Define the 9 angles with instructions
  const FACE_ANGLES = [
    { id: 'center', name: '正面', instruction: '请正对摄像头', icon: '⭕' },
    { id: 'up', name: '上方', instruction: '请稍微抬头', icon: '⬆️' },
    { id: 'down', name: '下方', instruction: '请稍微低头', icon: '⬇️' },
    { id: 'left', name: '左侧', instruction: '请稍微向左转头', icon: '⬅️' },
    { id: 'right', name: '右侧', instruction: '请稍微向右转头', icon: '➡️' },
    { id: 'up-left', name: '左上', instruction: '请向左上方看', icon: '↖️' },
    { id: 'up-right', name: '右上', instruction: '请向右上方看', icon: '↗️' },
    { id: 'down-left', name: '左下', instruction: '请向左下方看', icon: '↙️' },
    { id: 'down-right', name: '右下', instruction: '请向右下方看', icon: '↘️' },
  ]
  
  useEffect(() => {
    if (open) {
      startCamera()
      initializeDetection()
    }
    return () => {
      stopCamera()
      stopDetection()
    }
  }, [open])
  
  // Real-time face detection for quality feedback and angle guidance
  useEffect(() => {
    if (stage === 'ready' && videoRef.current) {
      const checkInterval = setInterval(async () => {
        if (!videoRef.current) return
        
        const result = await faceDetectionService.detectFace(videoRef.current)
        
        setFaceDetected(result.detected)
        setCurrentQuality(result.quality)
        
        // Update message based on current angle requirement
        if (currentAngleIndex < FACE_ANGLES.length) {
          const currentAngle = FACE_ANGLES[currentAngleIndex]
          if (!result.detected) {
            setDetectionMessage(`${currentAngle.instruction} - 未检测到人脸`)
          } else if (result.quality < 0.3) {
            setDetectionMessage(`${currentAngle.instruction} - ${result.message}`)
          } else {
            setDetectionMessage(`${currentAngle.instruction} - 可以拍摄了！`)
          }
        }
      }, 500) // Check every 500ms
      
      detectionIntervalRef.current = checkInterval
      return () => clearInterval(checkInterval)
    }
  }, [stage, currentAngleIndex])
  
  // Manual photo capture for current angle
  const capturePhotoManual = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('摄像头未就绪')
      return
    }
    
    if (!faceDetected) {
      setError('未检测到人脸，请调整位置')
      setTimeout(() => setError(null), 3000)
      return
    }
    
    if (currentQuality < 0.3) {
      setError(`人脸质量不足，请调整位置（当前质量：${Math.round(currentQuality * 100)}%）`)
      setTimeout(() => setError(null), 3000)
      return
    }
    
    try {
      const descriptor = await faceDetectionService.getFaceDescriptor(videoRef.current)
      
      if (!descriptor) {
        setError('未能提取人脸特征，请重新拍摄')
        return
      }
      
      // Capture photo
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const photoData = canvas.toDataURL('image/jpeg')
        
        setCapturedPhotos(prev => [...prev, photoData])
        setCapturedDescriptors(prev => [...prev, descriptor])
        
        // Flash effect
        if (videoRef.current) {
          videoRef.current.style.filter = 'brightness(2)'
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.style.filter = 'brightness(1)'
            }
          }, 100)
        }
        
        // Move to next angle
        if (currentAngleIndex < FACE_ANGLES.length - 1) {
          setCurrentAngleIndex(prev => prev + 1)
          setDetectionMessage(`已拍摄 ${FACE_ANGLES[currentAngleIndex].name}，请准备下一个角度`)
        } else {
          setDetectionMessage('所有角度拍摄完成！')
        }
      }
    } catch (err) {
      console.error('Failed to capture photo:', err)
      setError('拍摄失败，请重试')
    }
  }
  
  const initializeDetection = async () => {
    try {
      await faceDetectionService.initialize()
    } catch (err) {
      console.error('Failed to initialize face detection:', err)
      setError('无法加载人脸检测模型，请刷新页面重试')
      setStage('error')
    }
  }
  
  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isMobile ? 480 : 640 },
          height: { ideal: isMobile ? 640 : 480 },
          facingMode: 'user'
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
        }
      }
    } catch (err) {
      setError('无法访问摄像头，请确保已授予权限')
      setStage('error')
    }
  }
  
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }
  
  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }
  
  const startEnrollment = () => {
    setStage('ready')
    setCapturedPhotos([])
    setCapturedDescriptors([])
    setError(null)
  }
  
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setIsCapturing(false)
      return
    }
    
    try {
      // Get face descriptor
      const descriptor = await faceDetectionService.getFaceDescriptor(videoRef.current)
      
      if (descriptor) {
        // Capture photo
        const canvas = canvasRef.current
        const video = videoRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          const photoData = canvas.toDataURL('image/jpeg')
          
          setCapturedPhotos(prev => [...prev, photoData])
          setCapturedDescriptors(prev => [...prev, descriptor])
        }
        
        // Visual feedback
        if (videoRef.current) {
          videoRef.current.style.filter = 'brightness(1.5)'
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.style.filter = 'brightness(1)'
            }
          }, 200)
        }
        
        // Check if we have enough photos
        if (capturedPhotos.length + 1 >= REQUIRED_PHOTOS) {
          setTimeout(() => {
            completeEnrollment()
          }, 500)
        }
      } else {
        setDetectionMessage('拍摄失败，请重新对准')
      }
    } catch (err) {
      console.error('Failed to capture photo:', err)
    } finally {
      setIsCapturing(false)
    }
  }
  
  const completeEnrollment = async () => {
    if (capturedDescriptors.length < REQUIRED_PHOTOS) {
      setError(`请先拍摄所有 ${REQUIRED_PHOTOS} 个角度的照片`)
      return
    }
    
    setStage('processing')
    setUploadStatus('正在处理照片...')
    
    const user = authService.getCurrentUser()
    if (!user) {
      setError('用户未登录')
      setStage('error')
      return
    }
    
    try {
      setUploadStatus('正在保存多角度人脸特征...')
      
      // Store all 9 descriptors separately (not averaged)
      const allDescriptors = capturedDescriptors.map(desc => Array.from(desc))
      
      setUploadStatus('正在上传到数据库...')
      
      // Save all descriptors to database
      const { error: dbError } = await supabase
        .from('roleplay_users')
        .update({ 
          face_descriptor: allDescriptors, // Store as array of arrays
          face_enrolled_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (dbError) throw dbError
      
      // Also update local auth service cache
      authService.updateUserCache({
        ...user,
        face_descriptor: allDescriptors
      })
      
      setUploadStatus('✓ 9个角度的人脸数据已成功保存到数据库！')
      setStage('success')
      
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
      
    } catch (err: any) {
      console.error('Enrollment failed:', err)
      setError(err.message || '人脸注册失败')
      setStage('error')
    }
  }
  
  const handleClose = () => {
    setStage('idle')
    setCapturedPhotos([])
    setCapturedDescriptors([])
    setError(null)
    setIsCapturing(false)
    setCountdown(0)
    setCurrentAngleIndex(0)
    setFaceDetected(false)
    stopDetection()
    stopCamera()
    onClose()
  }
  
  const retry = () => {
    setStage('idle')
    setCapturedPhotos([])
    setCapturedDescriptors([])
    setError(null)
    setIsCapturing(false)
    setCountdown(0)
    setCurrentAngleIndex(0)
    setFaceDetected(false)
  }
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth={isMobile ? "sm" : "md"} 
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">智能人脸注册</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            请依次拍摄9个不同角度的人脸，每个角度只需轻微转动头部
          </Typography>
        </Alert>
        
        <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2}>
          {/* Left side - Video Feed and Controls */}
          <Box flex={1}>
            {/* Video container */}
            <Box position="relative">
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingTop: isMobile ? '133.33%' : '75%', // 3:4 for mobile, 4:3 for desktop
                  backgroundColor: '#000',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: currentQuality > 0.7 ? '3px solid #4caf50' : 
                         currentQuality > 0.3 ? '3px solid #ff9800' : 
                         '3px solid transparent'
                }}
              >
                <video
                  ref={videoRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    transition: 'filter 0.2s'
                  }}
                  autoPlay
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />
            
                {/* Quality indicator overlay */}
                {stage === 'ready' && currentQuality > 0 && (
                  <Box
                    position="absolute"
                    top={16}
                    right={16}
                    bgcolor={currentQuality > 0.7 ? 'success.main' : 
                            currentQuality > 0.3 ? 'warning.main' : 
                            'error.main'}
                    borderRadius="50%"
                    width={40}
                    height={40}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Typography variant="caption" color="white" fontWeight="bold">
                      {Math.round(currentQuality * 100)}%
                    </Typography>
                  </Box>
                )}
            
                {/* Upload status overlay */}
                {stage === 'processing' && uploadStatus && (
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bgcolor="rgba(0,0,0,0.7)"
                  >
                    <Box textAlign="center">
                      <CircularProgress color="inherit" sx={{ mb: 2 }} />
                      <Typography variant="h6" color="white">
                        {uploadStatus}
                      </Typography>
                    </Box>
                  </Box>
                )}
            
                {/* Success overlay */}
                {stage === 'success' && (
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bgcolor="rgba(76, 175, 80, 0.9)"
                    borderRadius="8px"
                  >
                    <Box textAlign="center">
                      <CheckCircle sx={{ fontSize: 60, color: 'white', mb: 2 }} />
                      <Typography variant="h5" color="white">
                        注册成功！
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
            
            {/* Current Angle Instruction - Below Camera */}
            {stage === 'ready' && currentAngleIndex < FACE_ANGLES.length && (
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2, 
                  mt: 2,
                  backgroundColor: faceDetected ? 
                    (currentQuality > 0.3 ? 'success.light' : 'warning.light') : 
                    'grey.100'
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      当前角度: {FACE_ANGLES[currentAngleIndex].name} {FACE_ANGLES[currentAngleIndex].icon}
                    </Typography>
                    <Typography variant="body2">
                      {FACE_ANGLES[currentAngleIndex].instruction}
                    </Typography>
                  </Box>
                  {faceDetected && (
                    <Box textAlign="right">
                      <Typography 
                        variant="caption" 
                        color={currentQuality > 0.3 ? 'success.dark' : 'warning.dark'}
                      >
                        {currentQuality > 0.3 ? '✓ 可以拍摄' : '⚠ 质量不足'}
                      </Typography>
                      <LinearProgress 
                        variant="determinate"
                        value={currentQuality * 100}
                        sx={{ 
                          mt: 0.5, 
                          height: 6,
                          borderRadius: 1,
                          backgroundColor: 'grey.300',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: currentQuality > 0.7 ? 'success.main' : 
                                           currentQuality > 0.3 ? 'warning.main' : 
                                           'error.main'
                          }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Paper>
            )}
            
            {/* Action Buttons */}
            <Box sx={{ mt: 2 }}>
              {/* Manual Capture Button */}
              {stage === 'ready' && (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  startIcon={<PhotoCamera />}
                  onClick={capturePhotoManual}
                  disabled={capturedPhotos.length >= REQUIRED_PHOTOS || !faceDetected || currentQuality < 0.3}
                  sx={{ height: 56 }}
                >
                  拍摄 {currentAngleIndex < FACE_ANGLES.length ? FACE_ANGLES[currentAngleIndex].name : '完成'} ({capturedPhotos.length}/{REQUIRED_PHOTOS})
                </Button>
              )}
              
              {/* Upload Button */}
              {capturedPhotos.length >= REQUIRED_PHOTOS && stage === 'ready' && (
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  size="large"
                  startIcon={<CloudUpload />}
                  onClick={completeEnrollment}
                  sx={{ mt: 2, height: 56 }}
                >
                  上传到数据库
                </Button>
              )}
              
              {/* Reset Button */}
              {capturedPhotos.length > 0 && stage === 'ready' && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Refresh />}
                  onClick={retry}
                  sx={{ mt: 1 }}
                >
                  重新拍摄
                </Button>
              )}
            </Box>
            
            {/* Captured photos preview - Below buttons */}
            {capturedPhotos.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" gutterBottom>
                  已拍摄照片 ({capturedPhotos.length}/{REQUIRED_PHOTOS})：
                </Typography>
                <Box 
                  sx={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 0.5,
                    mt: 1
                  }}
                >
                  {capturedPhotos.map((photo, index) => (
                    <Box
                      key={index}
                      sx={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: 1,
                        overflow: 'hidden',
                        border: '2px solid #4caf50'
                      }}
                    >
                      <img
                        src={photo}
                        alt={`${FACE_ANGLES[index].name}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: 'scaleX(-1)'
                        }}
                      />
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          textAlign: 'center',
                          fontSize: '10px',
                          p: 0.5
                        }}
                      >
                        {FACE_ANGLES[index].icon}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
          </Box>
          
          {/* Right side - Progress Panel with 9-Grid */}
          <Box width={isMobile ? '100%' : 300}>
            <Typography variant="h6" gutterBottom>
              拍摄进度
            </Typography>
            
            {/* 9-Grid Angle Indicator */}
            <Paper
              elevation={1}
              sx={{ 
                p: 1.5,
                mb: 2
              }}
            >
              <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ mb: 1 }}>
                请依次拍摘以下9个角度
              </Typography>
              <Box 
                sx={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1
                }}
              >
                {FACE_ANGLES.map((angle, index) => (
                  <Box
                    key={angle.id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1,
                      borderRadius: 1,
                      border: currentAngleIndex === index ? '2px solid' : '1px solid',
                      borderColor: 
                        capturedPhotos[index] ? 'success.main' :
                        currentAngleIndex === index ? 'primary.main' :
                        'grey.300',
                      backgroundColor: 
                        capturedPhotos[index] ? 'success.light' :
                        currentAngleIndex === index ? 'primary.light' :
                        'background.paper',
                      transition: 'all 0.3s',
                      minHeight: 70,
                      position: 'relative'
                    }}
                  >
                    <Typography variant="h5">{angle.icon}</Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        mt: 0.5,
                        fontWeight: currentAngleIndex === index ? 'bold' : 'normal'
                      }}
                    >
                      {angle.name}
                    </Typography>
                    {capturedPhotos[index] && (
                      <CheckCircle 
                        sx={{ 
                          fontSize: 20, 
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          color: 'success.main'
                        }} 
                      />
                    )}
                  </Box>
                ))}
              </Box>
            </Paper>
            
            {/* Overall Progress */}
            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">
                  总进度
                </Typography>
                <Typography variant="body2" color="primary">
                  {capturedPhotos.length} / {REQUIRED_PHOTOS}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(capturedPhotos.length / REQUIRED_PHOTOS) * 100}
                sx={{ 
                  height: 8,
                  borderRadius: 1
                }}
              />
            </Box>
            
            {/* Tips */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="caption">
                <strong>提示：</strong>每个角度只需轻微转动头部，不要过度偏转
              </Typography>
            </Alert>
            
            {/* Statistics */}
            {capturedPhotos.length > 0 && (
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  统计信息
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="caption" color="text.secondary">
                    已拍摄角度
                  </Typography>
                  <Typography variant="caption">
                    {capturedPhotos.length} 个
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    剩余角度
                  </Typography>
                  <Typography variant="caption">
                    {REQUIRED_PHOTOS - capturedPhotos.length} 个
                  </Typography>
                </Box>
              </Paper>
            )}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          {stage === 'success' ? '完成' : '取消'}
        </Button>
        {stage === 'idle' && (
          <Button
            variant="contained"
            onClick={startEnrollment}
            startIcon={<CameraAlt />}
          >
            开始注册
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// Face Test Dialog
const FaceTestDialog: React.FC<{
  open: boolean
  onClose: () => void
}> = ({ open, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string>('')
  const [confidence, setConfidence] = useState(0)
  const [isMatch, setIsMatch] = useState<boolean | null>(null)
  
  useEffect(() => {
    if (open) {
      startCamera()
      initializeFaceDetection()
    }
    return () => {
      stopCamera()
    }
  }, [open])
  
  const initializeFaceDetection = async () => {
    try {
      await faceDetectionService.initialize()
    } catch (err) {
      console.error('Failed to initialize face detection:', err)
      setTestResult('无法加载人脸检测模型')
    }
  }
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isMobile ? 480 : 640 },
          height: { ideal: isMobile ? 640 : 480 },
          facingMode: 'user'
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
        }
      }
    } catch (err) {
      setTestResult('无法访问摄像头')
    }
  }
  
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }
  
  const runTest = async () => {
    if (!videoRef.current) return
    
    setTesting(true)
    setTestResult('测试中...')
    
    const user = authService.getCurrentUser()
    if (!user) {
      setTestResult('用户未登录')
      setTesting(false)
      return
    }
    
    try {
      // Fetch user's stored face descriptor
      const { data, error } = await supabase
        .from('roleplay_users')
        .select('face_descriptor')
        .eq('id', user.id)
        .single()
      
      if (error || !data?.face_descriptor) {
        setTestResult('未找到注册的人脸数据')
        setIsMatch(false)
        setTesting(false)
        return
      }
      
      // Test face matching
      const result = await faceDetectionService.testFaceMatch(
        videoRef.current,
        data.face_descriptor
      )
      
      setTestResult(result.message)
      setConfidence(result.confidence)
      setIsMatch(result.match)
      
    } catch (err: any) {
      setTestResult(err.message || '测试失败')
      setIsMatch(false)
    } finally {
      setTesting(false)
    }
  }
  
  const handleClose = () => {
    setTestResult('')
    setIsMatch(null)
    setConfidence(0)
    stopCamera()
    onClose()
  }
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth={isMobile ? "sm" : "md"} 
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">人脸识别测试</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            点击"开始测试"按钮，系统将验证您的人脸是否匹配
          </Typography>
        </Alert>
        
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: isMobile ? '133.33%' : '75%', // 3:4 for mobile, 4:3 for desktop
              backgroundColor: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
              border: isMatch === true ? '3px solid #4caf50' : 
                     isMatch === false ? '3px solid #f44336' : 
                     '3px solid transparent'
            }}
          >
            <video
              ref={videoRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)'
              }}
              autoPlay
              playsInline
              muted
            />
          </Box>
          
          {/* Test result overlay */}
          {testResult && (
            <Box
              position="absolute"
              top={16}
              left={16}
              right={16}
              bgcolor={
                isMatch === true ? 'success.main' :
                isMatch === false ? 'error.main' :
                'rgba(0,0,0,0.7)'
              }
              borderRadius={1}
              p={2}
            >
              <Typography variant="body1" color="white" align="center">
                {testResult}
              </Typography>
              {confidence > 0 && (
                <LinearProgress 
                  variant="determinate"
                  value={confidence * 100}
                  sx={{ mt: 1 }}
                  color="inherit"
                />
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>关闭</Button>
        <Button
          variant="contained"
          onClick={runTest}
          disabled={testing}
          startIcon={testing ? <CircularProgress size={20} /> : <Science />}
        >
          {testing ? '测试中...' : '开始测试'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Main Profile Page Component
const ProfilePageEnhanced: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(authService.getCurrentUser())
  
  // Determine role from the current path
  const getRoleFromPath = (): 'manager' | 'chef' | 'duty-manager' => {
    if (location.pathname.includes('/manager')) return 'manager'
    if (location.pathname.includes('/chef')) return 'chef'
    if (location.pathname.includes('/duty-manager')) return 'duty-manager'
    return 'manager' // Default fallback
  }
  
  const currentRole = getRoleFromPath()
  const [hasFaceRegistered, setHasFaceRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  
  useEffect(() => {
    checkFaceStatus()
  }, [])
  
  const checkFaceStatus = async () => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      navigate('/login')
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('roleplay_users')
        .select('face_descriptor')
        .eq('id', currentUser.id)
        .single()
      
      setHasFaceRegistered(!!data?.face_descriptor && data.face_descriptor.length > 0)
    } catch (err) {
      console.error('Failed to check face status:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }
  
  const handleDeleteFace = async () => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) return
    
    try {
      const { error } = await supabase
        .from('roleplay_users')
        .update({ 
          face_descriptor: null,
          face_enrolled_at: null
        })
        .eq('id', currentUser.id)
      
      if (!error) {
        setHasFaceRegistered(false)
        setDeleteConfirmOpen(false)
        // Update local cache
        authService.updateUserCache({
          ...currentUser,
          face_descriptor: null
        })
      }
    } catch (err) {
      console.error('Failed to delete face data:', err)
    }
  }
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }
  
  return (
    <>
    <Container maxWidth="md" sx={{ py: 3, pb: 12 }}>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}>
              <Person fontSize="large" />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h5">{user?.display_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.role_name} · {user?.email}
              </Typography>
            </Box>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            人脸识别设置
          </Typography>
          
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1}>
                <Face color={hasFaceRegistered ? "success" : "disabled"} />
                <Box>
                  <Typography variant="subtitle1">
                    人脸数据状态
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {hasFaceRegistered ? '已注册' : '未注册'}
                  </Typography>
                </Box>
              </Box>
              
              {hasFaceRegistered ? (
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Science />}
                    onClick={() => setTestDialogOpen(true)}
                  >
                    测试识别
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<Delete />}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    删除数据
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<CameraAlt />}
                  onClick={() => setEnrollDialogOpen(true)}
                >
                  注册人脸
                </Button>
              )}
            </Box>
          </Paper>
          
          {hasFaceRegistered && (
            <Alert severity="success" sx={{ mb: 2 }}>
              您已完成人脸注册，可以使用人脸识别快速登录
            </Alert>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Box display="flex" justifyContent="flex-end">
            <Button 
              variant="outlined" 
              color="error"
              onClick={handleLogout}
            >
              退出登录
            </Button>
          </Box>
        </CardContent>
      </Card>
      
      {/* Face Enrollment Dialog */}
      <SmartFaceEnrollmentDialog
        open={enrollDialogOpen}
        onClose={() => setEnrollDialogOpen(false)}
        onSuccess={() => {
          setHasFaceRegistered(true)
          setEnrollDialogOpen(false)
        }}
      />
      
      {/* Face Test Dialog */}
      <FaceTestDialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>确认删除人脸数据</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            删除后您将无法使用人脸识别登录，需要重新注册
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteFace}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    
    {/* Navigation Bar */}
    <NavigationBar role={currentRole} />
  </>
  )
}

export default ProfilePageEnhanced