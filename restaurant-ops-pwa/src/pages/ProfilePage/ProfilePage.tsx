// Profile page with face enrollment feature
// Allows users to manage their profile and enroll face for authentication

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
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  Stack,
  IconButton
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
  Delete
} from '@mui/icons-material'
import { authService } from '../../services/authService'
import { faceRecognitionService } from '../../services/faceRecognitionService'
import { NavigationBar } from '../../components/Navigation/NavigationBar'

// Face enrollment dialog with best practices
const FaceEnrollmentDialog: React.FC<{
  open: boolean
  onClose: () => void
  onSuccess: () => void
}> = ({ open, onClose, onSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stage, setStage] = useState<'idle' | 'capturing' | 'processing' | 'success' | 'error'>('idle')
  const [captureProgress, setCaptureProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [samples, setSamples] = useState<number[]>([])
  const [currentInstruction, setCurrentInstruction] = useState('请正对摄像头')
  
  const TOTAL_SAMPLES = 5 // Capture 5 samples for better accuracy
  const INSTRUCTIONS = [
    '请正对摄像头',
    '请稍微向左转头',
    '请稍微向右转头',
    '请稍微抬头',
    '请稍微低头'
  ]
  
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
  
  const startEnrollment = async () => {
    if (!videoRef.current) return
    
    setStage('capturing')
    setSamples([])
    setCaptureProgress(0)
    
    const user = authService.getCurrentUser()
    if (!user) {
      setError('用户未登录')
      setStage('error')
      return
    }
    
    try {
      // Initialize face-api.js
      await faceRecognitionService.initialize()
      
      // Capture samples with different angles
      for (let i = 0; i < TOTAL_SAMPLES; i++) {
        setCurrentInstruction(INSTRUCTIONS[i])
        
        // Give user time to adjust position
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Capture sample
        setSamples(prev => [...prev, i + 1])
        setCaptureProgress((i + 1) / TOTAL_SAMPLES * 100)
        
        // Visual feedback
        if (videoRef.current) {
          // Flash effect
          videoRef.current.style.filter = 'brightness(1.5)'
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.style.filter = 'brightness(1)'
            }
          }, 200)
        }
      }
      
      // Process and save
      setStage('processing')
      await faceRecognitionService.enrollUser(user.id, videoRef.current, TOTAL_SAMPLES)
      
      setStage('success')
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
      
    } catch (err: any) {
      console.error('Enrollment failed:', err)
      setError(err.message || '人脸注册失败，请重试')
      setStage('error')
    }
  }
  
  const handleClose = () => {
    setStage('idle')
    setSamples([])
    setCaptureProgress(0)
    setError(null)
    stopCamera()
    onClose()
  }
  
  const retry = () => {
    setStage('idle')
    setSamples([])
    setCaptureProgress(0)
    setError(null)
  }
  
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">人脸注册</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Instructions */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            为了确保准确识别，系统将采集您在不同角度的面部数据
          </Typography>
        </Alert>
        
        <Box display="flex" gap={2}>
          {/* Video Feed */}
          <Box flex={1} position="relative">
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '360px',
                objectFit: 'cover',
                borderRadius: '8px',
                backgroundColor: '#000',
                transform: 'scaleX(-1)',
                transition: 'filter 0.2s'
              }}
              autoPlay
              playsInline
              muted
            />
            
            {/* Overlay for different stages */}
            {stage === 'capturing' && (
              <Box
                position="absolute"
                bottom={16}
                left={16}
                right={16}
                bgcolor="rgba(0,0,0,0.7)"
                borderRadius={1}
                p={2}
              >
                <Typography variant="h6" color="white" align="center">
                  {currentInstruction}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={captureProgress}
                  sx={{ mt: 1 }}
                />
              </Box>
            )}
            
            {stage === 'processing' && (
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
                borderRadius="8px"
              >
                <CircularProgress size={60} />
                <Typography variant="h6" color="white" sx={{ ml: 2 }}>
                  处理中...
                </Typography>
              </Box>
            )}
            
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
                bgcolor="rgba(0,0,0,0.7)"
                borderRadius="8px"
              >
                <CheckCircle color="success" sx={{ fontSize: 60 }} />
                <Typography variant="h6" color="white" sx={{ ml: 2 }}>
                  注册成功！
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Progress Panel */}
          <Box width={200}>
            <Typography variant="subtitle2" gutterBottom>
              采集进度
            </Typography>
            
            <Stack spacing={1} sx={{ mb: 2 }}>
              {INSTRUCTIONS.map((instruction, index) => (
                <Chip
                  key={index}
                  label={`${index + 1}. ${instruction.replace('请', '')}`}
                  size="small"
                  color={samples.includes(index + 1) ? 'success' : 'default'}
                  icon={samples.includes(index + 1) ? <CheckCircle /> : undefined}
                />
              ))}
            </Stack>
            
            <Typography variant="caption" color="text.secondary">
              <Security sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
              您的面部数据将被安全加密存储
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        {stage === 'error' && (
          <Button onClick={retry} startIcon={<Refresh />}>
            重试
          </Button>
        )}
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

// Main Profile Page Component
export const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [hasFaceEnrolled, setHasFaceEnrolled] = useState(false)
  const [showEnrollDialog, setShowEnrollDialog] = useState(false)
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
    
    // Check face enrollment status
    try {
      const enrolled = await faceRecognitionService.hasUserEnrolled(currentUser.id)
      setHasFaceEnrolled(enrolled)
    } catch (err) {
      console.error('Failed to check face enrollment:', err)
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
        alert('删除失败，请重试')
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
        
        {/* User Info Card */}
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
        
        {/* Face Recognition Card */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Face sx={{ mr: 1 }} />
              <Typography variant="h6">人脸识别</Typography>
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
                >
                  注册人脸
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
        
        {/* Actions */}
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
      
      {/* Face Enrollment Dialog */}
      <FaceEnrollmentDialog
        open={showEnrollDialog}
        onClose={() => setShowEnrollDialog(false)}
        onSuccess={() => {
          setHasFaceEnrolled(true)
          setShowEnrollDialog(false)
        }}
      />
      
      {/* Navigation Bar */}
      <NavigationBar role={user?.roleCode || 'manager'} />
    </Box>
  )
}