// Enhanced login page with automatic face detection
// Uses face-api.js for immediate face recognition without user interaction
// Falls back to manual login if no face detected within timeout
// Updated: 2025-08-12 - Automatic face detection on page load
// Updated: 2025-08-12 - Limited to 3 attempts with iPhone-like UI feedback

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Fade,
  Stack,
  Chip,
  LinearProgress,
  Avatar
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Restaurant,
  Face,
  Password,
  CheckCircle,
  Error as ErrorIcon,
  CameraAlt
} from '@mui/icons-material'
import { authService } from '../../services/authService'
import { faceRecognitionService } from '../../services/faceRecognitionService'
import { supabase } from '../../services/supabase'
import { faceModelManager } from '../../services/faceModelManager'

export const LoginPageEnhanced = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Face detection states
  const [faceDetectionState, setFaceDetectionState] = useState<'detecting' | 'success' | 'failed' | 'idle'>('idle')
  const [detectedUser, setDetectedUser] = useState<any>(null)
  const [loginMethod, setLoginMethod] = useState<'auto' | 'face' | 'password'>('password')
  const [cameraReady, setCameraReady] = useState(false)
  const [detectionProgress, setDetectionProgress] = useState(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [canRetry, setCanRetry] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize face-api.js on mount (but don't start detection)
  useEffect(() => {
    console.log('🚀 Initializing face recognition service...')
    initializeFaceService()
    
    return () => {
      stopCamera()
      if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current)
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current)
    }
  }, [])

  const initializeFaceService = async () => {
    try {
      // Check if models are already loaded (by preload)
      const status = faceModelManager.getModelStatus()
      console.log('📊 Model status on login page:', status)
      
      if (status.allLoaded) {
        console.log('✅ Face models already loaded (from preload)')
        return
      }
      
      // Try minimal load first for faster start
      if (!status.tinyFaceDetector) {
        console.log('⏳ Loading minimal models for quick start...')
        try {
          await faceModelManager.initializeMinimal()
          console.log('✅ Minimal models loaded, other models loading in background')
        } catch (minimalError) {
          console.warn('⚠️ Minimal model load failed, trying full initialization...')
          // Fall back to full initialization if minimal fails
          await faceModelManager.initialize()
        }
      } else {
        // If minimal already loaded, ensure all models are loaded
        console.log('⏳ Completing model loading...')
        await faceRecognitionService.initialize()
        console.log('✅ All face models loaded')
      }
    } catch (err: any) {
      console.error('❌ Failed to initialize face service:', err)
      // Show user-friendly error message for iOS issues
      if (err?.message?.includes('Load failed') || err?.message?.includes('TypeError')) {
        setError('人脸识别模型加载失败，请刷新页面重试。如果问题持续，请使用密码登录。')
      }
      // Don't block login, just disable face recognition
    }
  }

  // Start face detection when switching to face mode
  useEffect(() => {
    if (loginMethod === 'face') {
      console.log('👤 Switched to face login, starting detection...')
      startAutoDetection()
    } else if (loginMethod === 'password') {
      // Stop camera when switching back to password
      stopCamera()
      setFaceDetectionState('idle')
      setCanRetry(false)
      setAttemptCount(0)
    }
  }, [loginMethod])
  
  // Handle retry on face icon click
  const handleFaceRetry = () => {
    if (canRetry && faceDetectionState === 'failed') {
      console.log('🔄 Retrying face detection...')
      setFaceDetectionState('detecting')
      setCanRetry(false)
      setAttemptCount(0)
      setDetectionProgress(0)
      performAutoDetection()
    }
  }

  const startAutoDetection = async () => {
    // First check if models are loaded
    const status = faceModelManager.getModelStatus()
    if (!status.allLoaded) {
      // Initialize face service first
      await initializeFaceService()
      // Check again after initialization
      const newStatus = faceModelManager.getModelStatus()
      if (!newStatus.allLoaded) {
        setError('人脸识别模型加载失败，请刷新页面重试')
        setFaceDetectionState('idle')
        return
      }
    }
    
    setFaceDetectionState('detecting')
    setDetectionProgress(0)
    
    try {
      // Request camera permission with optimized constraints
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                   (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isIOS ? 320 : 640 },  // Lower resolution for iOS
          height: { ideal: isIOS ? 240 : 480 },
          facingMode: 'user',
          frameRate: { ideal: 15, max: 30 }  // Limit framerate for better performance
        }
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
            setCameraReady(true)
            console.log('📹 Camera ready, starting detection...')
            // Add a small delay to ensure state is updated
            setTimeout(() => {
              performAutoDetection()
            }, 100)
          } catch (playError) {
            console.error('Failed to play video:', playError)
          }
        }
      }
    } catch (err) {
      console.error('Camera access denied:', err)
      setFaceDetectionState('failed')
      setLoginMethod('password')
    }
  }

  const performAutoDetection = async () => {
    console.log('🔍 Starting performAutoDetection, cameraReady:', cameraReady)
    if (!videoRef.current) {
      console.error('❌ No video element')
      return
    }
    
    const MAX_ATTEMPTS = 1 // Only 1 attempt
    const ATTEMPT_INTERVAL = 1000 // Not needed for single attempt but keeping for consistency
    let attempts = 0
    
    // Reset states
    setCanRetry(false)
    setAttemptCount(0)
    
    // Progress animation
    detectionIntervalRef.current = setInterval(() => {
      setDetectionProgress(prev => Math.min(prev + 10, 100))
    }, 50)
    
    const tryDetection = async () => {
      if (!videoRef.current) {
        console.log('❌ No video ref in tryDetection')
        return false
      }
      
      console.log('🔍 Attempting face detection with BEST MATCH strategy...')
      
      try {
        // Get all users with face descriptors
        const { data: users, error: dbError } = await supabase
          .from('roleplay_users')
          .select('*')
          .not('face_descriptor', 'is', null)
        
        console.log('👥 Found users with face data:', users?.length || 0)
        
        if (dbError || !users || users.length === 0) {
          console.log('No enrolled users found', dbError)
          return false
        }
        
        // Use the new optimized batch matching function
        console.log('📊 Starting optimized batch matching...')
        const matchResult = await faceRecognitionService.findBestMatch(
          videoRef.current!,
          users
        )
        
        // Check if we found a match
        if (matchResult.isMatch && matchResult.user) {
          const displayName = matchResult.user.full_name || matchResult.user.username || '用户'
          
          console.log('🏆 Match found:')
          console.log(`   User: ${displayName}`)
          console.log(`   Distance: ${matchResult.distance.toFixed(3)}`)
          console.log(`   Similarity: ${matchResult.similarity.toFixed(1)}%`)
          
          setDetectedUser(matchResult.user)
          setFaceDetectionState('success')
          setSuccess(`识别成功！欢迎回来，${displayName} (相似度: ${matchResult.similarity.toFixed(0)}%)`)
          
          // Auto-login after 1 second
          setTimeout(() => {
            handleAutoLogin(matchResult.user)
          }, 1000)
          
          return true
        }
        
        console.log('❌ No matches found with threshold 0.35')
        return false
      } catch (err) {
        console.error('Detection attempt failed:', err)
        return false
      }
    }
    
    // Try detection multiple times
    const detectionLoop = async () => {
      console.log('🚀 Starting detection loop...')
      while (attempts < MAX_ATTEMPTS) {
        attempts++
        setAttemptCount(attempts) // Update UI with current attempt
        console.log(`🔍 Detection attempt ${attempts}/${MAX_ATTEMPTS}`)
        
        const matched = await tryDetection()
        if (matched) {
          if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current)
          stopCamera()
          return
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, ATTEMPT_INTERVAL))
      }
      
      // No face matched after the attempt
      console.log('⚠️ No face detected')
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current)
      setFaceDetectionState('failed')
      setCanRetry(true)
      setAttemptCount(MAX_ATTEMPTS)
      // Don't switch to password, stay on face login with error state
      // stopCamera() - Keep camera running for retry
    }
    
    console.log('📌 Calling detectionLoop...')
    detectionLoop().catch(err => {
      console.error('Detection loop error:', err)
      setFaceDetectionState('failed')
      setCanRetry(true)
      // Don't switch to password
    })
  }

  const handleAutoLogin = async (userData: any) => {
    setLoading(true)
    try {
      // Fetch role information from database
      const { data: roleData, error: roleError } = await supabase
        .from('roleplay_roles')
        .select('role_code, role_name_zh')
        .eq('id', userData.role_id)
        .single()
      
      if (roleError || !roleData) {
        throw new Error('Failed to fetch role information')
      }
      
      // Set the user in auth service with correct field names
      authService.setCurrentUser({
        id: userData.id,
        email: userData.username ? `${userData.username}@restaurant.com` : userData.email || '',
        displayName: userData.full_name || userData.username || '用户',
        role: roleData.role_name_zh,  // Use the Chinese role name
        roleCode: roleData.role_code,
        restaurantId: userData.restaurant_id
      })
      
      // Navigate to role selection or dashboard
      navigate('/role-selection')
    } catch (err) {
      console.error('Auto-login failed:', err)
      setError('自动登录失败，请使用密码登录')
      setLoginMethod('password')
    } finally {
      setLoading(false)
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

  // Clean up camera and detection on unmount to prevent hanging
  useEffect(() => {
    return () => {
      console.log('[LoginPage] Cleaning up camera and detection...')
      // Clear any running detection timeouts
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current)
        detectionTimeoutRef.current = null
      }
      if (detectionIntervalRef.current) {
        clearTimeout(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
      // Stop camera stream
      stopCamera()
      // Reset detection state
      setFaceDetectionState('idle')
      setCanRetry(false)
      setAttemptCount(0)
    }
  }, [])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { user, error: loginError } = await authService.login(username, password)
      
      if (loginError) {
        setError(loginError)
        return
      }

      // Check if user has enrolled face
      if (user && user.id) {
        const hasEnrolled = await faceRecognitionService.hasUserEnrolled(user.id)
        if (!hasEnrolled) {
          setSuccess('登录成功！建议您注册人脸以便下次快速登录')
        }
      }

      // Navigate to role selection
      navigate('/role-selection')
    } catch (err: any) {
      console.error('Login error:', err)
      setError('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleManualFaceLogin = async () => {
    if (!videoRef.current || !cameraReady) {
      setError('摄像头未就绪')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      // Get all users with face descriptors
      const { data: users, error: dbError } = await supabase
        .from('roleplay_users')
        .select('*')
        .not('face_descriptor', 'is', null)
      
      if (dbError || !users || users.length === 0) {
        throw new Error('没有已注册的用户，请先使用密码登录')
      }
      
      console.log('🔍 Manual face login with BEST MATCH strategy...')
      
      // Collect all matches with their distances
      const matches: Array<{user: any, distance: number, similarity: number}> = []
      
      for (const userData of users) {
        try {
          const result = await (faceRecognitionService as any).calculateMatchDistance(
            userData.id, 
            videoRef.current
          )
          
          if (result.isMatch) {
            matches.push({
              user: userData,
              distance: result.distance,
              similarity: result.similarity
            })
            console.log(`Match found: ${userData.full_name || userData.username} - Distance: ${result.distance.toFixed(3)}`)
          }
        } catch (err) {
          continue
        }
      }
      
      if (matches.length === 0) {
        throw new Error('未识别到已注册的人脸 (阈值: 0.35)')
      }
      
      // Select the best match (lowest distance)
      matches.sort((a, b) => a.distance - b.distance)
      const bestMatch = matches[0]
      
      console.log(`✅ Best match: ${bestMatch.user.full_name || bestMatch.user.username} (Similarity: ${bestMatch.similarity.toFixed(1)}%)`)
      
      setSuccess(`识别成功！欢迎回来，${bestMatch.user.full_name || bestMatch.user.username || '用户'} (相似度: ${bestMatch.similarity.toFixed(0)}%)`)
      handleAutoLogin(bestMatch.user)
    } catch (err: any) {
      setError(err.message || '人脸识别失败')
    } finally {
      setLoading(false)
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
        <Paper 
          elevation={3}
          sx={{ 
            width: '100%',
            p: 4,
            borderRadius: 2
          }}
        >
          {/* Header */}
          <Box textAlign="center" mb={3}>
            <Restaurant sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" gutterBottom>
              餐厅运营管理系统
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Restaurant Operations Management
            </Typography>
          </Box>

          {/* Hidden video element for face detection */}
          <Box sx={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '320px', height: '240px' }}
            />
          </Box>

          {/* Success Message */}
          {faceDetectionState === 'success' && detectedUser && (
            <Fade in>
              <Box mb={3}>
                <Alert 
                  severity="success" 
                  icon={<CheckCircle />}
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      {(detectedUser.full_name || detectedUser.username)?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="body1">
                        识别成功！
                      </Typography>
                      <Typography variant="body2">
                        欢迎回来，{detectedUser.full_name || detectedUser.username || '用户'}
                      </Typography>
                    </Box>
                  </Box>
                </Alert>
              </Box>
            </Fade>
          )}

          {/* Login Method Toggle */}
          <Stack direction="row" spacing={2} justifyContent="center" mb={3}>
            <Chip
              icon={<Password />}
              label="密码登录"
              color={loginMethod === 'password' ? 'primary' : 'default'}
              onClick={() => {
                setLoginMethod('password')
                setError('')
                setSuccess('')
              }}
              clickable
            />
            <Chip
              icon={<Face />}
              label="人脸登录"
              color={loginMethod === 'face' ? 'primary' : 'default'}
              onClick={() => {
                setLoginMethod('face')
                setError('')
                setSuccess('')
              }}
              clickable
            />
          </Stack>

          {/* Error/Success Messages */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && !detectedUser && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Password Login Form */}
          {loginMethod === 'password' && (
            <Fade in>
              <Box component="form" onSubmit={handlePasswordLogin}>
                <TextField
                  fullWidth
                  label="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="username"
                  autoFocus
                />
                
                <TextField
                  fullWidth
                  label="密码"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                  startIcon={loading && <CircularProgress size={20} />}
                >
                  {loading ? '登录中...' : '登录'}
                </Button>
              </Box>
            </Fade>
          )}

          {/* Automatic Face Detection */}
          {loginMethod === 'face' && (
            <Fade in>
              <Box textAlign="center">
                {faceDetectionState === 'loading' && (
                  <>
                    <Alert severity="info" icon={<CircularProgress size={16} />} sx={{ mb: 2 }}>
                      {modelLoadingMessage || '正在加载人脸识别模型...'}
                    </Alert>
                    <LinearProgress 
                      variant="determinate" 
                      value={modelLoadingProgress} 
                      sx={{ mb: 2 }}
                    />
                  </>
                )}
                
                {faceDetectionState === 'detecting' && (
                  <>
                    <Alert severity="info" icon={<CameraAlt />} sx={{ mb: 2 }}>
                      正在识别您的面部...
                    </Alert>
                    <LinearProgress 
                      variant="determinate" 
                      value={detectionProgress} 
                      sx={{ mb: 2 }}
                    />
                  </>
                )}
                
                {faceDetectionState === 'failed' && (
                  <>
                    {/* Subtle error message */}
                    <Typography variant="body1" color="error" sx={{ mb: 1 }}>
                      未能识别您的面部
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      请确保光线充足并正对摄像头
                    </Typography>
                  </>
                )}
                
                {faceDetectionState !== 'failed' && (
                  <Typography variant="body2" color="text.secondary">
                    {cameraReady 
                      ? '请将面部对准摄像头，系统将自动识别' 
                      : '正在启动摄像头...'}
                  </Typography>
                )}
                
                {/* Clickable Face Icon */}
                <Box 
                  onClick={handleFaceRetry}
                  sx={{ 
                    mt: 2, 
                    width: 100, 
                    height: 100, 
                    margin: '20px auto',
                    borderRadius: '50%',
                    border: '3px solid',
                    borderColor: 
                      faceDetectionState === 'failed' ? 'error.main' : 
                      faceDetectionState === 'detecting' || faceDetectionState === 'loading' ? 'primary.main' : 
                      'grey.300',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canRetry ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    animation: 
                      faceDetectionState === 'detecting' || faceDetectionState === 'loading' ? 'pulse 2s infinite' : 
                      faceDetectionState === 'failed' ? 'shake 0.5s' : 'none',
                    '&:hover': canRetry ? {
                      transform: 'scale(1.05)',
                      borderColor: 'error.dark'
                    } : {},
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.05)' },
                      '100%': { transform: 'scale(1)' }
                    },
                    '@keyframes shake': {
                      '0%, 100%': { transform: 'translateX(0)' },
                      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-3px)' },
                      '20%, 40%, 60%, 80%': { transform: 'translateX(3px)' }
                    }
                  }}
                >
                  <Face 
                    sx={{ 
                      fontSize: 48, 
                      color: 
                        faceDetectionState === 'failed' ? 'error.main' :
                        faceDetectionState === 'detecting' || faceDetectionState === 'loading' ? 'primary.main' : 
                        'grey.500',
                      transition: 'color 0.3s ease'
                    }} 
                  />
                </Box>
                
                {/* Retry hint text */}
                {canRetry && faceDetectionState === 'failed' && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'text.secondary', 
                      display: 'block',
                      mt: 1
                    }}
                  >
                    点击人脸图标重试
                  </Typography>
                )}
              </Box>
            </Fade>
          )}
        </Paper>
      </Box>
    </Container>
  )
}