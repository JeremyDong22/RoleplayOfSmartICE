// Enhanced login page with FaceIO face recognition
// Supports both traditional password login and face recognition login

import type { FC } from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
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
  Chip
} from '@mui/material'
import {
  Face,
  Password,
  PersonAdd,
  Login as LoginIcon
} from '@mui/icons-material'
import { signIn, clearError } from '../../store/authSlice'
import { faceIOService } from '../../services/faceIOService'
import { supabase } from '../../services/supabase'
import type { AppDispatch, RootState } from '../../store'

export const LoginWithFace: FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginMethod, setLoginMethod] = useState<'password' | 'face'>('password')
  const [faceLoginLoading, setFaceLoginLoading] = useState(false)
  const [faceError, setFaceError] = useState<string | null>(null)
  const [showEnrollment, setShowEnrollment] = useState(false)
  
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { user, isLoading, error } = useSelector((state: RootState) => state.auth)

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

  // Initialize FaceIO on component mount
  useEffect(() => {
    faceIOService.initialize().catch(err => {
      console.error('Failed to initialize FaceIO:', err)
    })
  }, [])

  // Traditional password login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(signIn({ email, password }))
  }

  // Face recognition login
  const handleFaceLogin = async () => {
    setFaceLoginLoading(true)
    setFaceError(null)
    
    try {
      // Use FaceIO to authenticate
      const faceio = (window as any).faceio
      if (!faceio) {
        await faceIOService.initialize()
      }
      
      // FaceIO will handle camera and verification
      const response = await (window as any).faceio.authenticate({
        locale: 'zh'
      })
      
      console.log('[FaceLogin] Authentication response:', response)
      
      // Find user by FaceIO ID
      const { data: userData, error: dbError } = await supabase
        .from('roleplay_users')
        .select('*')
        .eq('faceio_id', response.facialId)
        .single()
      
      if (dbError || !userData) {
        throw new Error('未找到关联的用户账号，请先使用密码登录并注册人脸')
      }
      
      // Login with the found user's email
      // For demo, we'll need to handle this differently in production
      // In production, you'd want a separate auth method for face login
      setEmail(userData.email)
      setFaceError('人脸验证成功！正在登录...')
      
      // Auto-login with the user's credentials
      // Note: In production, implement a secure face-based auth flow
      dispatch(signIn({ 
        email: userData.email, 
        password: 'face-auth-bypass' // This needs backend support
      }))
      
    } catch (err: any) {
      console.error('[FaceLogin] Failed:', err)
      setFaceError(err.message || '人脸识别失败，请重试')
    } finally {
      setFaceLoginLoading(false)
    }
  }

  // Face enrollment for new users
  const handleFaceEnrollment = async () => {
    if (!email) {
      setFaceError('请先输入邮箱')
      return
    }
    
    setFaceLoginLoading(true)
    setFaceError(null)
    
    try {
      // First login with password to get user ID
      if (!user) {
        setFaceError('请先使用密码登录')
        return
      }
      
      // Enroll face with FaceIO
      const facialId = await faceIOService.enrollUser(user.id, user.display_name || email)
      
      setFaceError('人脸注册成功！下次可以使用人脸登录')
      setShowEnrollment(false)
      
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
                onClick={() => setLoginMethod('password')}
                clickable
              />
              <Chip
                icon={<Face />}
                label="人脸登录"
                color={loginMethod === 'face' ? 'primary' : 'default'}
                onClick={() => setLoginMethod('face')}
                clickable
              />
            </Stack>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Error Messages */}
            {(error || faceError) && (
              <Alert 
                severity="error" 
                sx={{ mb: 2 }} 
                onClose={() => {
                  dispatch(clearError())
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
                {user && !showEnrollment && (
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    sx={{ mt: 1 }}
                    startIcon={<PersonAdd />}
                    onClick={() => setShowEnrollment(true)}
                  >
                    注册人脸（下次可人脸登录）
                  </Button>
                )}
                
                {showEnrollment && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      点击下方按钮开始人脸注册
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ mt: 1 }}
                      onClick={handleFaceEnrollment}
                      disabled={faceLoginLoading}
                      startIcon={faceLoginLoading ? <CircularProgress size={16} /> : <Face />}
                    >
                      {faceLoginLoading ? '注册中...' : '开始注册'}
                    </Button>
                  </Alert>
                )}
              </Box>
            )}
            
            {/* Face Login */}
            {loginMethod === 'face' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Face sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  人脸识别登录
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  点击下方按钮，使用已注册的人脸快速登录
                </Typography>
                
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleFaceLogin}
                  disabled={faceLoginLoading}
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
                Powered by FaceIO - 安全的人脸识别技术
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}