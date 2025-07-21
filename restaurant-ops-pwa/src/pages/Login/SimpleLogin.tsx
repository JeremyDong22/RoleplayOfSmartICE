// Simple Login page component for testing
import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container
} from '@mui/material'

export const SimpleLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Login attempt:', { email, password })
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
              <TextField
                fullWidth
                label="邮箱 Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
              />
              
              <TextField
                fullWidth
                label="密码 Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3 }}
              >
                登录 Login
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}