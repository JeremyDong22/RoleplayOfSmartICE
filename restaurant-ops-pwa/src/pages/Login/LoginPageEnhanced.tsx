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
import { getSupabase, resetSupabaseClient } from '../../services/supabase'
import { faceModelManager } from '../../services/faceModelManager'
import { faceDetectionCleanup } from '../../services/faceDetectionCleanup'

export const LoginPageEnhanced = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Face detection states
  const [faceDetectionState, setFaceDetectionState] = useState<'detecting' | 'success' | 'failed' | 'idle' | 'no-match' | 'timeout'>('idle')
  const [detectedUser, setDetectedUser] = useState<any>(null)
  const [loginMethod, setLoginMethod] = useState<'auto' | 'face' | 'password'>('password')
  const [cameraReady, setCameraReady] = useState(false)
  const [detectionProgress, setDetectionProgress] = useState(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [canRetry, setCanRetry] = useState(false)
  const [detectionMessage, setDetectionMessage] = useState('正在启动摄像头...')
  const [detectionStage, setDetectionStage] = useState<'camera' | 'database' | 'matching' | 'done'>('camera')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize face-api.js on mount (but don't start detection)
  useEffect(() => {
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
      
      if (status.allLoaded) {
        return
      }
      
      // Try minimal load first for faster start
      if (!status.tinyFaceDetector) {
        try {
          await faceModelManager.initializeMinimal()
        } catch (minimalError) {
          // Fall back to full initialization if minimal fails
          await faceModelManager.initialize()
        }
      } else {
        // If minimal already loaded, ensure all models are loaded
        await faceRecognitionService.initialize()
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
      // Ensure clean state before starting
      completeCleanup().then(() => {
        startAutoDetection()
      })
    } else if (loginMethod === 'password') {
      // Complete cleanup when switching back to password
      completeCleanup()
    }
  }, [loginMethod])
  
  // Handle retry on face icon click
  const handleFaceRetry = () => {
    if (canRetry && (faceDetectionState === 'failed' || faceDetectionState === 'no-match' || faceDetectionState === 'timeout')) {
      setFaceDetectionState('detecting')
      setCanRetry(false)
      setAttemptCount(0)
      setDetectionProgress(0)
      setDetectionMessage('正在启动摄像头...')
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
      // Register stream with cleanup service
      faceDetectionCleanup.registerStream(stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Register video with cleanup service
        faceDetectionCleanup.registerVideo(videoRef.current)
        
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
            setCameraReady(true)
            // Add a small delay to ensure state is updated
            setTimeout(() => {
              performAutoDetection()
            }, 100)
          } catch (playError) {
            // Video play failed
          }
        }
      }
    } catch (err) {
      setFaceDetectionState('failed')
      setLoginMethod('password')
    }
  }

  const performAutoDetection = async () => {
    // Don't check cameraReady here - it's called after camera is ready
    if (!videoRef.current) {
      return
    }
    
    const MAX_ATTEMPTS = 3 // Increased to 3 attempts for better success rate
    const ATTEMPT_INTERVAL = 500 // Reduced interval between attempts
    const DETECTION_TIMEOUT = 10000 // 10 seconds total timeout
    let attempts = 0
    
    // Reset states
    setCanRetry(false)
    setAttemptCount(0)
    setDetectionProgress(0)
    setDetectionStage('camera')
    
    // Set overall timeout
    const overallTimeout = setTimeout(() => {
      if (faceDetectionState === 'detecting') {
        setFaceDetectionState('timeout')
        setDetectionMessage('识别超时，请重试')
        setCanRetry(true)
        setDetectionProgress(100)
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current)
      }
    }, DETECTION_TIMEOUT)
    
    const tryDetection = async () => {
      if (!videoRef.current) {
        return false
      }
      
      try {
        // Stage 1: Camera ready (0-20%)
        setDetectionStage('camera')
        setDetectionMessage('摄像头已就绪，开始检测...')
        setDetectionProgress(20)
        
        // Stage 2: Database query (20-50%)
        setDetectionStage('database')
        setDetectionMessage('正在查询用户数据库...')
        setDetectionProgress(30)
        
        // Get all users with face descriptors with timeout using AbortController
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        
        let result
        try {
          result = await getSupabase()
            .from('roleplay_users')
            .select('*')
            .not('face_descriptor', 'is', null)
            .abortSignal(controller.signal)
          
          setDetectionProgress(50) // Database query complete
          // Small delay to show the progress
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (err: any) {
          clearTimeout(timeout)
          if (err.name === 'AbortError' || err.message?.includes('abort')) {
            // Reset the Supabase client and retry once
            const freshSupabase = resetSupabaseClient()
            const retryController = new AbortController()
            const retryTimeout = setTimeout(() => retryController.abort(), 5000)
            
            try {
              result = await freshSupabase
                .from('roleplay_users')
                .select('*')
                .not('face_descriptor', 'is', null)
                .abortSignal(retryController.signal)
            } finally {
              clearTimeout(retryTimeout)
            }
          } else {
            throw err
          }
        } finally {
          clearTimeout(timeout)
        }
        
        const { data: users, error: dbError } = result as any
        
        if (dbError || !users || users.length === 0) {
          setDetectionMessage('未找到注册用户')
          setDetectionProgress(100)
          return false
        }
        
        // Stage 3: Face matching (50-90%)
        setDetectionStage('matching')
        setDetectionMessage(`正在匹配人脸（共${users.length}个用户）...`)
        setDetectionProgress(60)
        
        // Add small delay to show the matching stage
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Progress animation during matching
        setDetectionProgress(70)
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Use the new optimized batch matching function
        const matchResult = await faceRecognitionService.findBestMatch(
          videoRef.current!,
          users
        )
        
        setDetectionProgress(80)
        await new Promise(resolve => setTimeout(resolve, 200))
        setDetectionProgress(90)
        
        // Add small delay to show the progress
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Stage 4: Process result (90-100%)
        setDetectionStage('done')
        
        // Check if we found a match
        if (matchResult.isMatch && matchResult.user) {
          const displayName = matchResult.user.full_name || matchResult.user.username || '用户'
          
          setDetectionMessage('识别成功！')
          setDetectionProgress(100)
          setDetectedUser(matchResult.user)
          setFaceDetectionState('success')
          setSuccess(`识别成功！欢迎回来，${displayName} (相似度: ${matchResult.similarity.toFixed(0)}%)`)
          
          // Auto-login after 1 second
          setTimeout(() => {
            handleAutoLogin(matchResult.user)
          }, 1000)
          
          return true
        } else {
          // No match found
          setDetectionMessage('未找到匹配的用户')
          setDetectionProgress(100)
        }
        
        return false
      } catch (err) {
        return false
      }
    }
    
    // Try detection multiple times
    const detectionLoop = async () => {
      while (attempts < MAX_ATTEMPTS) {
        attempts++
        setAttemptCount(attempts) // Update UI with current attempt
        setDetectionMessage(`第 ${attempts}/${MAX_ATTEMPTS} 次尝试...`)
        
        const matched = await tryDetection()
        if (matched) {
          clearTimeout(overallTimeout)
          stopCamera()
          return
        }
        
        // Wait before next attempt (if not last attempt)
        if (attempts < MAX_ATTEMPTS) {
          setDetectionMessage('准备重试...')
          await new Promise(resolve => setTimeout(resolve, ATTEMPT_INTERVAL))
        }
      }
      
      // No face matched after all attempts
      clearTimeout(overallTimeout)
      setFaceDetectionState('no-match')
      setDetectionMessage('未能识别您的身份，请确保您已注册人脸')
      setCanRetry(true)
      setAttemptCount(MAX_ATTEMPTS)
      setDetectionProgress(100)
      // Don't switch to password, stay on face login with error state
      // stopCamera() - Keep camera running for retry
    }
    
    detectionLoop().catch(err => {
      clearTimeout(overallTimeout)
      setFaceDetectionState('failed')
      setDetectionMessage('检测过程出错，请重试')
      setCanRetry(true)
      setDetectionProgress(100)
      // Don't switch to password
    })
  }

  const handleAutoLogin = async (userData: any) => {
    setLoading(true)
    try {
      // Fetch role information from database
      const { data: roleData, error: roleError } = await getSupabase()
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
      setError('自动登录失败，请使用密码登录')
      setLoginMethod('password')
    } finally {
      setLoading(false)
    }
  }

  const stopCamera = () => {
    // 1. Stop and disable all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false // Extra safety - disable track
      })
      streamRef.current = null
    }
    
    // 2. Fully reset video element
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
      videoRef.current.load() // Force reload to clear internal state
      // Remove all event listeners
      videoRef.current.onloadedmetadata = null
      videoRef.current.onloadeddata = null
    }
    
    setCameraReady(false)
  }

  // Complete cleanup function for face detection
  const completeCleanup = async () => {
    // Clear any running detection timeouts
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current)
      detectionTimeoutRef.current = null
    }
    if (detectionIntervalRef.current) {
      clearTimeout(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    
    // Stop camera with full cleanup
    stopCamera()
    
    // Reset all detection states
    setFaceDetectionState('idle')
    setCanRetry(false)
    setAttemptCount(0)
    setDetectionProgress(0)
    setDetectedUser(null)
    
    // Use centralized cleanup service
    await faceDetectionCleanup.performCompleteCleanup()
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      completeCleanup()
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
      const { data: users, error: dbError } = await getSupabase()
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
                      {detectionMessage}
                    </Alert>
                    <LinearProgress 
                      variant="determinate" 
                      value={detectionProgress} 
                      sx={{ mb: 2 }}
                    />
                    {attemptCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        第 {attemptCount}/3 次尝试
                      </Typography>
                    )}
                  </>
                )}
                
                {(faceDetectionState === 'failed' || faceDetectionState === 'no-match' || faceDetectionState === 'timeout') && (
                  <>
                    {/* Contextual error message */}
                    <Alert 
                      severity={faceDetectionState === 'no-match' ? 'warning' : 'error'} 
                      sx={{ mb: 2 }}
                      onClose={() => setFaceDetectionState('idle')}
                    >
                      {detectionMessage}
                    </Alert>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {faceDetectionState === 'no-match' ? '请确保您已注册人脸或尝试密码登录' :
                       faceDetectionState === 'timeout' ? '网络可能不稳定，请检查网络后重试' :
                       '请确保光线充足并正对摄像头'}
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
                      (faceDetectionState === 'failed' || faceDetectionState === 'timeout') ? 'error.main' :
                      faceDetectionState === 'no-match' ? 'warning.main' : 
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
                      (faceDetectionState === 'failed' || faceDetectionState === 'timeout') ? 'shake 0.5s' : 'none',
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
                        (faceDetectionState === 'failed' || faceDetectionState === 'timeout') ? 'error.main' :
                        faceDetectionState === 'no-match' ? 'warning.main' :
                        faceDetectionState === 'detecting' || faceDetectionState === 'loading' ? 'primary.main' : 
                        'grey.500',
                      transition: 'color 0.3s ease'
                    }} 
                  />
                </Box>
                
                {/* Retry hint text */}
                {canRetry && (faceDetectionState === 'failed' || faceDetectionState === 'no-match' || faceDetectionState === 'timeout') && (
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