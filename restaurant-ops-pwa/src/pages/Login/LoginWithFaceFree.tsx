// Free login page with face-api.js face recognition
// No external API costs - runs entirely in browser

import type { FC } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
// import { useDispatch, useSelector } from 'react-redux'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  Face,
  Password,
  PersonAdd,
  Login as LoginIcon,
  CameraAlt,
  CheckCircle
} from '@mui/icons-material'
// import { signIn, clearError } from '../../store/authSlice'
import { faceRecognitionService } from '../../services/faceRecognitionService'
import { supabase } from '../../services/supabase'
// import type { AppDispatch, RootState } from '../../store'
import { authService } from '../../services/authService'

export const LoginWithFaceFree: FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginMethod, setLoginMethod] = useState<'password' | 'face'>('password')
  const [faceLoginLoading, setFaceLoginLoading] = useState(false)
  const [faceError, setFaceError] = useState<string | null>(null)
  const [showEnrollment, setShowEnrollment] = useState(false)
  const [showFaceLogin, setShowFaceLogin] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const navigate = useNavigate()
  // const dispatch = useDispatch<AppDispatch>()
  // const { user, isLoading, error } = useSelector((state: RootState) => state.auth)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = authService.getCurrentUser()

  useEffect(() => {
    if (user) {
      // Redirect based on role
      switch (user.role) {
        case 'CEO':
          navigate('/ceo-dashboard')
          break
        case 'Manager':
          navigate('/manager-dashboard')
          break
        case 'Chef':
          navigate('/chef-dashboard')
          break
        default:
          navigate('/tasks')
      }
    }
  }, [user, navigate])

  // Initialize face-api.js on component mount
  useEffect(() => {
    faceRecognitionService.initialize().catch(err => {
      console.error('Failed to initialize face recognition:', err)
    })
  }, [])

  // Traditional password login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      await authService.signIn(email, password)
      navigate('/role-selection')
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setIsLoading(false)
    }
  }

  // Start camera for face operations
  const startCamera = async () => {
    try {
      setFaceError(null)
      
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
          setCameraReady(true)
        }
      }
    } catch (err) {
      console.error('Failed to start camera:', err)
      setFaceError('无法访问摄像头，请确保已授予权限')
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
    setCameraReady(false)
  }

  // Face recognition login
  const handleFaceLogin = async () => {
    if (!videoRef.current || !cameraReady) {
      setFaceError('摄像头未就绪')
      return
    }
    
    setFaceLoginLoading(true)
    setFaceError(null)
    
    try {
      // Get all users with face descriptors
      const { data: users, error: dbError } = await supabase
        .from('roleplay_users')
        .select('*')
        .not('face_descriptor', 'is', null)
      
      if (dbError || !users || users.length === 0) {
        throw new Error('没有已注册的用户，请先使用密码登录并注册人脸')
      }
      
      // Try to match face with each user
      let matchedUser = null
      for (const userData of users) {
        try {
          const isMatch = await faceRecognitionService.verifyUser(userData.id, videoRef.current)
          if (isMatch) {
            matchedUser = userData
            break
          }
        } catch (err) {
          // Continue to next user
          continue
        }
      }
      
      if (!matchedUser) {
        throw new Error('未识别到已注册的人脸，请确保是本人操作')
      }
      
      setFaceError('人脸验证成功！正在登录...')
      
      // Auto-login with the matched user's credentials
      // Note: In production, implement a secure face-based auth flow
      try {
        await authService.signIn(matchedUser.email, 'face-auth-bypass')
        navigate('/role-selection')
      } catch (err: any) {
        setFaceError(err.message || '人脸登录失败')
      }
      
    } catch (err: any) {
      console.error('[FaceLogin] Failed:', err)
      setFaceError(err.message || '人脸识别失败，请重试')
    } finally {
      setFaceLoginLoading(false)
    }
  }

  // Face enrollment for logged-in users
  const handleFaceEnrollment = async () => {
    if (!user) {
      setFaceError('请先使用密码登录')
      return
    }
    
    if (!videoRef.current || !cameraReady) {
      setFaceError('摄像头未就绪')
      return
    }
    
    setFaceLoginLoading(true)
    setFaceError(null)
    
    try {
      // Enroll face with multiple samples
      await faceRecognitionService.enrollUser(user.id, videoRef.current, 3)
      
      setFaceError('人脸注册成功！下次可以使用人脸登录')
      setTimeout(() => {
        setShowEnrollment(false)
        stopCamera()
      }, 2000)
      
    } catch (err: any) {
      console.error('[FaceEnrollment] Failed:', err)
      setFaceError(err.message || '人脸注册失败，请重试')
    } finally {
      setFaceLoginLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" align="center" gutterBottom>
              餐厅运营管理系统
            </Typography>
            <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
              Restaurant Operations Management
            </Typography>
            
            {/* Login Method Selection */}
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3, mb: 2 }}>
              <Chip
                icon={<Password />}
                label="密码登录"
                color={loginMethod === 'password' ? 'primary' : 'default'}
                onClick={() => {
                  setLoginMethod('password')
                  setShowFaceLogin(false)
                  stopCamera()
                }}
                clickable
              />
              <Chip
                icon={<Face />}
                label="人脸登录"
                color={loginMethod === 'face' ? 'primary' : 'default'}
                onClick={() => {
                  setLoginMethod('face')
                  setShowFaceLogin(true)
                  startCamera()
                }}
                clickable
              />
            </Stack>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Error Messages */}
            {(error || faceError) && (
              <Alert 
                severity={faceError?.includes('成功') ? 'success' : 'error'}
                sx={{ mb: 2 }} 
                onClose={() => {
                  setError(null)
                  setFaceError(null)
                }}
              >
                {error || faceError}
              </Alert>
            )}
            
            {/* Password Login Form */}
            {loginMethod === 'password' && (
              <Box component="form" onSubmit={handlePasswordLogin}>
                <TextField
                  fullWidth
                  label="邮箱 Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="email"
                />
                
                <TextField
                  fullWidth
                  label="密码 Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="current-password"
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <LoginIcon />}
                >
                  {isLoading ? '登录中...' : '登录 Login'}
                </Button>
                
                {/* Face Enrollment Option for Logged-in Users */}
                {user && (
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    sx={{ mt: 1 }}
                    startIcon={<PersonAdd />}
                    onClick={() => {
                      setShowEnrollment(true)
                      startCamera()
                    }}
                  >
                    注册人脸（下次可人脸登录）
                  </Button>
                )}
              </Box>
            )}
            
            {/* Face Login */}
            {loginMethod === 'face' && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    height: '300px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    backgroundColor: '#000',
                    transform: 'scaleX(-1)',
                    marginBottom: '16px'
                  }}
                  autoPlay
                  playsInline
                  muted
                />
                
                <Typography variant="h6" gutterBottom>
                  人脸识别登录
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {cameraReady ? '请正对摄像头，点击下方按钮进行识别' : '正在启动摄像头...'}
                </Typography>
                
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleFaceLogin}
                  disabled={!cameraReady || faceLoginLoading}
                  startIcon={faceLoginLoading ? <CircularProgress size={20} /> : <Face />}
                  sx={{ minWidth: 200 }}
                >
                  {faceLoginLoading ? '识别中...' : '开始人脸识别'}
                </Button>
                
                <Typography variant="caption" display="block" sx={{ mt: 3 }}>
                  首次使用？请先使用密码登录并注册人脸
                </Typography>
              </Box>
            )}
            
            {/* Footer */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                使用 face-api.js - 完全免费的浏览器端人脸识别
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
      
      {/* Face Enrollment Dialog */}
      <Dialog open={showEnrollment} onClose={() => {
        setShowEnrollment(false)
        stopCamera()
      }} maxWidth="sm" fullWidth>
        <DialogTitle>注册人脸</DialogTitle>
        <DialogContent>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '300px',
              objectFit: 'cover',
              borderRadius: '8px',
              backgroundColor: '#000',
              transform: 'scaleX(-1)',
              marginTop: '8px'
            }}
            autoPlay
            playsInline
            muted
          />
          
          {faceError && (
            <Alert severity={faceError.includes('成功') ? 'success' : 'error'} sx={{ mt: 2 }}>
              {faceError}
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {cameraReady 
              ? '请保持正对摄像头，系统将采集多个角度的人脸数据'
              : '正在启动摄像头...'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowEnrollment(false)
            stopCamera()
          }}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleFaceEnrollment}
            disabled={!cameraReady || faceLoginLoading}
            startIcon={faceLoginLoading ? <CircularProgress size={16} /> : <CameraAlt />}
          >
            {faceLoginLoading ? '注册中...' : '开始注册'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}