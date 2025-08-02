// Role selection page for choosing between Manager, Chef and Duty Manager
// Updated: 2025-07-24 - Added authentication check for role access
import { useNavigate } from 'react-router-dom'
import { Box, Container, Typography, Paper, Button, Alert } from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import NightlightIcon from '@mui/icons-material/Nightlight'
import LogoutIcon from '@mui/icons-material/Logout'
import { authService } from '../services/authService'
import { useState } from 'react'

export const RoleSelection = () => {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const currentUser = authService.getCurrentUser()

  const handleRoleSelect = (role: 'manager' | 'chef' | 'duty-manager') => {
    console.log(`[Navigation] Attempting to navigate to: /${role}`)
    
    // Check if user has permission to access this role
    const roleCodeMap: Record<string, string> = {
      'manager': 'manager',
      'chef': 'chef',
      'duty-manager': 'duty_manager'
    }
    
    const requiredRole = roleCodeMap[role]
    if (currentUser?.roleCode !== requiredRole) {
      setError(`您没有权限访问此角色。您的角色是：${currentUser?.role}`)
      return
    }
    
    // Store role in localStorage for persistence
    localStorage.setItem('selectedRole', role)
    
    // Navigate to the selected role page
    navigate(`/${role}`)
    
    console.log(`[Navigation] Navigation called for: /${role}`)
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          height: '100vh',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 1, sm: 2, md: 3 },
          px: { xs: 1, sm: 2 },
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Logout button in top-right corner */}
        <Button
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20
          }}
        >
          退出登录
        </Button>

        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ 
            fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
            mb: { xs: 1, sm: 2 }
          }}
        >
          餐厅运营管理系统
        </Typography>
        <Typography 
          variant="h5" 
          color="text.secondary" 
          gutterBottom 
          align="center" 
          sx={{ 
            fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
            mb: { xs: 2, sm: 3 }
          }}
        >
          Restaurant Operations Management
        </Typography>

        {/* User info */}
        <Typography 
          variant="h6" 
          align="center" 
          sx={{ mb: 2 }}
        >
          欢迎，{currentUser?.name} ({currentUser?.role})
        </Typography>
        
        <Typography 
          variant="h6" 
          gutterBottom 
          align="center" 
          sx={{ 
            fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
            mb: { xs: 2, sm: 3, md: 4 }
          }}
        >
          请选择您的角色 / Please select your role
        </Typography>

        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError('')}
            sx={{ mb: 2, width: '100%', maxWidth: 600 }}
          >
            {error}
          </Alert>
        )}

        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1200,
            width: '100%',
            flex: 1,
            overflow: 'hidden'
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 2, sm: 3, md: 4 },
                textAlign: 'center',
                cursor: currentUser?.roleCode === 'manager' ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: currentUser?.roleCode === 'manager' ? 1 : 0.5,
                '&:hover': currentUser?.roleCode === 'manager' ? {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  backgroundColor: 'primary.light',
                  color: 'white',
                } : {},
              }}
              onClick={() => handleRoleSelect('manager')}
            >
              <SupervisorAccountIcon sx={{ fontSize: { xs: 48, sm: 64, md: 80 }, mb: 1 }} />
              <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>
                前厅经理
              </Typography>
              <Typography variant="h6" color="inherit" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}>
                Manager
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, display: { xs: 'none', sm: 'block' } }}>
                负责前厅运营管理
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, fontSize: { xs: '0.625rem', sm: '0.75rem', md: '0.875rem' }, display: { xs: 'none', sm: 'block' } }}>
                Front-of-house operations
              </Typography>
              <Button
                variant="contained"
                size="large"
                sx={{ 
                  mt: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 2, sm: 3 }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRoleSelect('manager')
                }}
              >
                选择此角色 / Select
              </Button>
            </Paper>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 2, sm: 3, md: 4 },
                textAlign: 'center',
                cursor: currentUser?.roleCode === 'chef' ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: currentUser?.roleCode === 'chef' ? 1 : 0.5,
                '&:hover': currentUser?.roleCode === 'chef' ? {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  backgroundColor: 'secondary.light',
                  color: 'white',
                } : {},
              }}
              onClick={() => handleRoleSelect('chef')}
            >
              <RestaurantIcon sx={{ fontSize: { xs: 48, sm: 64, md: 80 }, mb: 1 }} />
              <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>
                后厨主管
              </Typography>
              <Typography variant="h6" color="inherit" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}>
                Chef
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, display: { xs: 'none', sm: 'block' } }}>
                负责后厨运营管理
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, fontSize: { xs: '0.625rem', sm: '0.75rem', md: '0.875rem' }, display: { xs: 'none', sm: 'block' } }}>
                Kitchen operations
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                sx={{ 
                  mt: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 2, sm: 3 }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRoleSelect('chef')
                }}
              >
                选择此角色 / Select
              </Button>
            </Paper>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 2, sm: 3, md: 4 },
                textAlign: 'center',
                cursor: currentUser?.roleCode === 'duty_manager' ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: currentUser?.roleCode === 'duty_manager' ? 1 : 0.5,
                '&:hover': (currentUser?.roleCode === 'duty_manager') ? {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  backgroundColor: 'info.light',
                  color: 'white',
                } : {},
              }}
              onClick={() => handleRoleSelect('duty-manager')}
            >
              <NightlightIcon sx={{ fontSize: { xs: 48, sm: 64, md: 80 }, mb: 1 }} />
              <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>
                值班经理
              </Typography>
              <Typography variant="h6" color="inherit" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}>
                Duty Manager
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, display: { xs: 'none', sm: 'block' } }}>
                负责午晚市值班管理
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, fontSize: { xs: '0.625rem', sm: '0.75rem', md: '0.875rem' }, display: { xs: 'none', sm: 'block' } }}>
                Shift management
              </Typography>
              <Button
                variant="contained"
                color="info"
                size="large"
                sx={{ 
                  mt: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 2, sm: 3 }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRoleSelect('duty-manager')
                }}
              >
                选择此角色 / Select
              </Button>
            </Paper>
          </Box>
        </Box>

        <Box sx={{ mt: { xs: 2, sm: 4, md: 6 }, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' }, display: 'block' }}>
            选择角色后，系统将显示相应的任务和工作流程
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' }, display: { xs: 'none', sm: 'block' } }}>
            After selecting a role, the system will display relevant tasks and workflows
          </Typography>
        </Box>
      </Box>
    </Container>
  )
}