// Mobile-optimized Profile page with responsive face enrollment
// Camera takes primary focus with minimal UI elements

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  DialogContent,
  LinearProgress,
  Chip,
  Stack,
  IconButton,
  Fab,
  Slide,
  useTheme,
  useMediaQuery
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
  ArrowBack
} from '@mui/icons-material'
import { authService } from '../../services/authService'
import { faceRecognitionService } from '../../services/faceRecognitionService'
import { faceDetectionService, type RequiredAngle } from '../../services/faceDetectionService'
import { NavigationBar } from '../../components/Navigation/NavigationBar'
import { supabase } from '../../services/supabase'
import * as faceapi from 'face-api.js'

// Mobile-optimized Face Enrollment Dialog
const MobileFaceEnrollmentDialog: React.FC<{
  open: boolean
  onClose: () => void
  onSuccess: () => void
}> = ({ open, onClose, onSuccess }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [stage, setStage] = useState<'idle' | 'capturing' | 'processing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0)
  const [capturedAngles, setCapturedAngles] = useState<boolean[]>([false, false, false, false, false])
  const [angleMessage, setAngleMessage] = useState('准备开始')
  const [isCorrectAngle, setIsCorrectAngle] = useState(false)
  const [autoCapturing, setAutoCapturing] = useState(false)
  const [capturedDescriptors, setCapturedDescriptors] = useState<Float32Array[]>([])
  const [countDown, setCountDown] = useState(0)
  
  const REQUIRED_ANGLES: RequiredAngle[] = ['front', 'left', 'right', 'up', 'down']
  const ANGLE_LABELS = {
    'front': '正面',
    'left': '左侧',
    'right': '右侧',
    'up': '抬头',
    'down': '低头'
  }
  const ANGLE_ICONS = {
    'front': '😊',
    'left': '👈',
    'right': '👉',
    'up': '👆',
    'down': '👇'
  }
  
  useEffect(() => {
    if (open) {
      startCamera()
      startDetection()
    }
    return () => {
      stopCamera()
      stopDetection()
    }
  }, [open])
  
  // Countdown timer
  useEffect(() => {
    if (countDown > 0) {
      const timer = setTimeout(() => setCountDown(countDown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countDown])
  
  // Real-time face detection
  useEffect(() => {
    if (stage === 'capturing' && videoRef.current) {
      const checkInterval = setInterval(async () => {
        if (!videoRef.current) return
        
        const result = await faceDetectionService.detectFaceWithAngles(
          videoRef.current,
          REQUIRED_ANGLES[currentAngleIndex]
        )
        
        setAngleMessage(result.message)
        setIsCorrectAngle(result.isCorrectAngle || false)
        
        // Auto-capture when angle is correct
        if (result.isCorrectAngle && !autoCapturing && countDown === 0) {
          setAutoCapturing(true)
          setCountDown(3) // 3 second countdown
          setTimeout(() => {
            captureCurrentAngle()
          }, 3000)
        }
      }, 200)
      
      detectionIntervalRef.current = checkInterval
      return () => clearInterval(checkInterval)
    }
  }, [stage, currentAngleIndex, autoCapturing, countDown])
  
  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
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
      setError('无法访问摄像头')
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
  
  const startDetection = async () => {
    try {
      await faceDetectionService.initialize()
    } catch (err) {
      console.error('Failed to initialize:', err)
    }
  }
  
  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }
  
  const startEnrollment = () => {
    setStage('capturing')
    setCapturedAngles([false, false, false, false, false])
    setCapturedDescriptors([])
    setCurrentAngleIndex(0)
    setAutoCapturing(false)
    setCountDown(0)
  }
  
  const captureCurrentAngle = async () => {
    if (!videoRef.current) return
    
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()
      
      if (detection) {
        setCapturedDescriptors(prev => [...prev, detection.descriptor])
        
        const newCaptured = [...capturedAngles]
        newCaptured[currentAngleIndex] = true
        setCapturedAngles(newCaptured)
        
        // Flash effect
        if (videoRef.current) {
          videoRef.current.style.filter = 'brightness(1.8)'
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.style.filter = 'brightness(1)'
            }
          }, 300)
        }
        
        // Move to next angle
        if (currentAngleIndex < REQUIRED_ANGLES.length - 1) {
          setCurrentAngleIndex(currentAngleIndex + 1)
          setAutoCapturing(false)
          setIsCorrectAngle(false)
          setCountDown(0)
        } else {
          await completeEnrollment()
        }
      }
    } catch (err) {
      console.error('Capture failed:', err)
    }
  }
  
  const completeEnrollment = async () => {
    setStage('processing')
    
    const user = authService.getCurrentUser()
    if (!user) {
      setError('用户未登录')
      setStage('error')
      return
    }
    
    try {
      const avgDescriptor = new Float32Array(128)
      for (let i = 0; i < 128; i++) {
        let sum = 0
        for (const descriptor of capturedDescriptors) {
          sum += descriptor[i]
        }
        avgDescriptor[i] = sum / capturedDescriptors.length
      }
      
      const { error: dbError } = await supabase
        .from('roleplay_users')
        .update({ face_descriptor: Array.from(avgDescriptor) })
        .eq('id', user.id)
      
      if (dbError) throw dbError
      
      setStage('success')
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
      
    } catch (err: any) {
      console.error('Enrollment failed:', err)
      setError(err.message || '注册失败')
      setStage('error')
    }
  }
  
  const handleClose = () => {
    setStage('idle')
    setCapturedAngles([false, false, false, false, false])
    setCurrentAngleIndex(0)
    setError(null)
    setCountDown(0)
    stopDetection()
    stopCamera()
    onClose()
  }
  
  const retry = () => {
    setStage('idle')
    setCapturedAngles([false, false, false, false, false])
    setCurrentAngleIndex(0)
    setError(null)
    setAutoCapturing(false)
    setCountDown(0)
  }
  
  return (
    <Dialog 
      open={open} 
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          m: 0,
          maxHeight: '100vh',
          bgcolor: '#000'
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative', height: '100vh', overflow: 'hidden' }}>
        {/* Close button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 10,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
          }}
        >
          <Close />
        </IconButton>
        
        {/* Main Camera View - Full Screen */}
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)'
            }}
            autoPlay
            playsInline
            muted
          />
          
          {/* Top Status Bar */}
          {stage === 'capturing' && (
            <Box
              sx={{
                position: 'absolute',
                top: 60,
                left: 16,
                right: 16,
                bgcolor: isCorrectAngle ? 'success.main' : 'rgba(0,0,0,0.6)',
                borderRadius: 2,
                p: 1.5,
                transition: 'all 0.3s'
              }}
            >
              <Typography variant="body2" color="white" align="center" fontWeight="bold">
                {angleMessage}
              </Typography>
            </Box>
          )}
          
          {/* Current Angle Instruction - Center */}
          {stage === 'capturing' && (
            <Box
              sx={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}
            >
              <Typography variant="h1" sx={{ color: 'white', fontSize: '4rem', mb: 1 }}>
                {ANGLE_ICONS[REQUIRED_ANGLES[currentAngleIndex]]}
              </Typography>
              <Typography variant="h4" sx={{ color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                请{ANGLE_LABELS[REQUIRED_ANGLES[currentAngleIndex]]}
              </Typography>
              
              {/* Countdown */}
              {countDown > 0 && (
                <Typography 
                  variant="h1" 
                  sx={{ 
                    color: 'white', 
                    mt: 2,
                    fontSize: '5rem',
                    fontWeight: 'bold',
                    textShadow: '3px 3px 6px rgba(0,0,0,0.7)'
                  }}
                >
                  {countDown}
                </Typography>
              )}
            </Box>
          )}
          
          {/* Bottom Progress Bar - Compact */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0,0,0,0.8)',
              p: 2
            }}
          >
            {/* Progress dots */}
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
              {REQUIRED_ANGLES.map((angle, index) => (
                <Box
                  key={angle}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: capturedAngles[index] ? 'success.main' : 
                             index === currentAngleIndex ? 'primary.main' : 
                             'grey.700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    border: index === currentAngleIndex && isCorrectAngle ? '2px solid #4caf50' : 'none'
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'white', fontSize: '1.2rem' }}>
                    {capturedAngles[index] ? '✓' : ANGLE_ICONS[angle]}
                  </Typography>
                </Box>
              ))}
            </Stack>
            
            {/* Linear progress */}
            <LinearProgress 
              variant="determinate" 
              value={(capturedAngles.filter(Boolean).length / 5) * 100}
              sx={{ height: 6, borderRadius: 1 }}
            />
            
            {/* Action buttons */}
            {stage === 'idle' && (
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={startEnrollment}
                startIcon={<CameraAlt />}
                sx={{ mt: 2 }}
              >
                开始注册
              </Button>
            )}
            
            {stage === 'error' && (
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleClose}
                  sx={{ color: 'white', borderColor: 'white' }}
                >
                  取消
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={retry}
                  startIcon={<Refresh />}
                >
                  重试
                </Button>
              </Stack>
            )}
          </Box>
          
          {/* Success Overlay */}
          {stage === 'success' && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(76, 175, 80, 0.95)'
              }}
            >
              <CheckCircle sx={{ fontSize: 100, color: 'white', mb: 2 }} />
              <Typography variant="h4" sx={{ color: 'white' }}>
                注册成功！
              </Typography>
            </Box>
          )}
          
          {/* Processing Overlay */}
          {stage === 'processing' && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,0,0,0.8)'
              }}
            >
              <CircularProgress size={80} sx={{ color: 'white', mb: 2 }} />
              <Typography variant="h5" sx={{ color: 'white' }}>
                处理中...
              </Typography>
            </Box>
          )}
          
          {/* Error Display */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                position: 'absolute',
                top: '50%',
                left: 16,
                right: 16,
                transform: 'translateY(-50%)'
              }}
            >
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

// Mobile-optimized Face Test Dialog
const MobileFaceTestDialog: React.FC<{
  open: boolean
  onClose: () => void
}> = ({ open, onClose }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string>('')
  const [confidence, setConfidence] = useState(0)
  const [isMatch, setIsMatch] = useState<boolean | null>(null)
  
  useEffect(() => {
    if (open) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [open])
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
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
      const { data, error } = await supabase
        .from('roleplay_users')
        .select('face_descriptor')
        .eq('id', user.id)
        .single()
      
      if (error || !data?.face_descriptor) {
        setTestResult('未找到已注册的人脸数据')
        setIsMatch(false)
        setTesting(false)
        return
      }
      
      const result = await faceDetectionService.testFaceMatch(
        videoRef.current,
        data.face_descriptor
      )
      
      setTestResult(result.message)
      setConfidence(result.confidence)
      setIsMatch(result.match)
    } catch (err: any) {
      setTestResult('测试失败')
      setIsMatch(false)
    } finally {
      setTesting(false)
    }
  }
  
  return (
    <Dialog 
      open={open} 
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { m: 0, bgcolor: '#000' }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative', height: isMobile ? '100vh' : '500px' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 10,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white'
          }}
        >
          <ArrowBack />
        </IconButton>
        
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)'
          }}
          autoPlay
          playsInline
          muted
        />
        
        {/* Test Result Overlay */}
        {testResult && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: 16,
              right: 16,
              transform: 'translateY(-50%)',
              bgcolor: isMatch === null ? 'info.main' : isMatch ? 'success.main' : 'error.main',
              borderRadius: 2,
              p: 2
            }}
          >
            <Typography variant="h6" color="white" align="center">
              {testResult}
            </Typography>
            {confidence > 0 && (
              <>
                <LinearProgress 
                  variant="determinate" 
                  value={confidence * 100}
                  sx={{ mt: 1, height: 8, borderRadius: 1 }}
                />
                <Typography variant="body2" color="white" align="center" sx={{ mt: 1 }}>
                  置信度: {(confidence * 100).toFixed(1)}%
                </Typography>
              </>
            )}
          </Box>
        )}
        
        {/* Test Button */}
        <Fab
          color="primary"
          onClick={runTest}
          disabled={testing}
          sx={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          {testing ? <CircularProgress size={24} color="inherit" /> : <Science />}
        </Fab>
      </DialogContent>
    </Dialog>
  )
}

// Main Profile Page
export const ProfilePageMobile: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [hasFaceEnrolled, setHasFaceEnrolled] = useState(false)
  const [showEnrollDialog, setShowEnrollDialog] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadUserData()
  }, [])
  
  const loadUserData = async () => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      navigate('/login')
      return
    }
    
    setUser(currentUser)
    
    try {
      const enrolled = await faceRecognitionService.hasUserEnrolled(currentUser.id)
      setHasFaceEnrolled(enrolled)
    } catch (err) {
      console.error('Failed to check enrollment:', err)
    }
    
    setLoading(false)
  }
  
  const handleDeleteFace = async () => {
    if (!user) return
    
    if (window.confirm('确定要删除已注册的人脸数据吗？')) {
      try {
        await faceRecognitionService.clearUserFaceData(user.id)
        setHasFaceEnrolled(false)
        alert('人脸数据已删除')
      } catch (err) {
        alert('删除失败')
      }
    }
  }
  
  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }
  
  const getRoleDisplay = () => {
    const roleMap: { [key: string]: string } = {
      'manager': '前厅经理',
      'chef': '后厨主管',
      'duty-manager': '值班经理'
    }
    return roleMap[user?.roleCode] || user?.role || '未知角色'
  }
  
  return (
    <Box sx={{ pb: 8 }}>
      <Container maxWidth="sm" sx={{ pt: 2 }}>
        <Typography variant="h5" gutterBottom>
          个人中心
        </Typography>
        
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar sx={{ width: 60, height: 60, mr: 2 }}>
                <Person />
              </Avatar>
              <Box>
                <Typography variant="h6">{user?.display_name || user?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {getRoleDisplay()}
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              邮箱：{user?.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              用户ID：{user?.id?.slice(0, 8)}...
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center">
                <Face sx={{ mr: 1 }} />
                <Typography variant="h6">人脸识别</Typography>
              </Box>
              {hasFaceEnrolled && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Science />}
                  onClick={() => setShowTestDialog(true)}
                >
                  测试
                </Button>
              )}
            </Box>
            
            {hasFaceEnrolled ? (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    已注册人脸，可使用人脸识别功能
                  </Typography>
                </Alert>
                
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => setShowEnrollDialog(true)}
                  >
                    重新注册
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={handleDeleteFace}
                  >
                    删除人脸
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    注册人脸后，可在登录和任务提交时使用人脸识别
                  </Typography>
                </Alert>
                
                <Button
                  variant="contained"
                  startIcon={<CameraAlt />}
                  onClick={() => setShowEnrollDialog(true)}
                  fullWidth
                  size="large"
                >
                  注册人脸
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={handleLogout}
            >
              退出登录
            </Button>
          </CardContent>
        </Card>
      </Container>
      
      <MobileFaceEnrollmentDialog
        open={showEnrollDialog}
        onClose={() => setShowEnrollDialog(false)}
        onSuccess={() => {
          setHasFaceEnrolled(true)
          setShowEnrollDialog(false)
        }}
      />
      
      <MobileFaceTestDialog
        open={showTestDialog}
        onClose={() => setShowTestDialog(false)}
      />
      
      <NavigationBar role={user?.roleCode || 'manager'} />
    </Box>
  )
}