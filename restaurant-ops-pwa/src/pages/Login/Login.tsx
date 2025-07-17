// Login page component for restaurant operations management
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
  Container
} from '@mui/material'
import { signIn, clearError } from '../../store/authSlice'
import { AppDispatch, RootState } from '../../store'

export const Login: FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(signIn({ email, password }))
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
            
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
                  {error}
                </Alert>
              )}
              
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
                sx={{ mt: 3 }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : '登录 Login'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}