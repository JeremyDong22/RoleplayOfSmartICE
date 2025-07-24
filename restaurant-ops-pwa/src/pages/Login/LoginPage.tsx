// Login page component for restaurant operations system
// Created: 2025-07-24 - Implements user authentication with Supabase
import { useState } from 'react'
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
  IconButton
} from '@mui/material'
import { Visibility, VisibilityOff, Restaurant } from '@mui/icons-material'
import { authService } from '../../services/authService'

export const LoginPage = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { user, error: loginError } = await authService.login(username, password)
      
      if (loginError) {
        setError(loginError)
        return
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

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 3
        }}
      >
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Restaurant sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              餐厅运营管理系统
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Restaurant Operations Management
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="用户名 / Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoComplete="username"
              autoFocus
            />

            <TextField
              fullWidth
              label="密码 / Password"
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
                )
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                '登录 / Login'
              )}
            </Button>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              请使用您的员工账号登录
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Please use your employee account to login
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}