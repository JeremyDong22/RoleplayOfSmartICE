// Role selection page for choosing between Manager, Chef, Duty Manager and CEO
// Updated: 2025-07-24 - Added authentication check for role access
// Updated: 2025-08-04 - Added CEO role selection
import { useNavigate } from 'react-router-dom'
import { Box, Container, Typography, Paper, Button, Alert, IconButton } from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import NightlightIcon from '@mui/icons-material/Nightlight'
import LogoutIcon from '@mui/icons-material/Logout'
import BusinessIcon from '@mui/icons-material/Business'
import { authService } from '../services/authService'
import { useState } from 'react'

export const RoleSelection = () => {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const currentUser = authService.getCurrentUser()
  
  // Debug: Log current user info

  const handleRoleSelect = (role: 'manager' | 'chef' | 'duty-manager' | 'ceo') => {
    
    // Check if user has permission to access this role
    const roleCodeMap: Record<string, string> = {
      'manager': 'manager',
      'chef': 'chef',
      'duty-manager': 'duty_manager',
      'ceo': 'ceo'
    }
    
    const requiredRole = roleCodeMap[role]
    
    // Administrator can access all roles
    if (currentUser?.roleCode === 'administrator') {
      // Store both the selected role and that it's an admin viewing this role
      localStorage.setItem('selectedRole', role)
      localStorage.setItem('isAdministratorMode', 'true')
      navigate(`/${role}`)
      return
    }
    
    // Special handling for CEO role - also check if role name is "总经理"
    if (role === 'ceo') {
      if (currentUser?.roleCode !== 'ceo' && currentUser?.role !== '总经理') {
        setError(`您没有权限访问此角色。您的角色是：${currentUser?.role}`)
        return
      }
    } else if (currentUser?.roleCode !== requiredRole) {
      setError(`您没有权限访问此角色。您的角色是：${currentUser?.role}`)
      return
    }
    
    // Store role in localStorage for persistence
    localStorage.setItem('selectedRole', role)
    localStorage.setItem('isAdministratorMode', 'false')
    
    // Navigate to the selected role page
    navigate(`/${role}`)
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }

  return (
    <Container maxWidth="lg" sx={{ overflow: 'visible', height: 'auto' }}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 1, sm: 2, md: 3 },
          px: { xs: 1, sm: 2 },
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {/* Logout button - icon only, positioned to avoid overlap */}
        <IconButton
          color="error"
          onClick={handleLogout}
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 1300,
            backgroundColor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText',
              boxShadow: 4
            }
          }}
          title="退出登录"
        >
          <LogoutIcon />
        </IconButton>

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
        
        {/* Special message for administrator */}
        {currentUser?.roleCode === 'administrator' && (
          <Alert 
            severity="info" 
            sx={{ mb: 2, width: '100%', maxWidth: 600 }}
          >
            作为系统管理员，您可以访问所有角色的功能
          </Alert>
        )}
        
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
            display: 'grid',
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)', 
              lg: 'repeat(4, 1fr)' 
            },
            gap: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1400,
            width: '100%',
            flex: 1,
            overflow: 'visible'
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

          {/* CEO Role Card */}
          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 2, sm: 3, md: 4 },
                textAlign: 'center',
                cursor: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? 1 : 0.5,
                background: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? 
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                  'inherit',
                '&:hover': (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? {
                  transform: 'translateY(-4px)',
                  boxShadow: 8,
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                } : {},
              }}
              onClick={() => handleRoleSelect('ceo')}
            >
              <BusinessIcon 
                sx={{ 
                  fontSize: { xs: 48, sm: 64, md: 80 }, 
                  mb: 1,
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? '#fff' : 'inherit'
                }} 
              />
              <Typography 
                variant="h4" 
                gutterBottom 
                sx={{ 
                  fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' },
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? '#fff' : 'inherit'
                }}
              >
                首席执行官
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? '#fff' : 'inherit'
                }}
              >
                CEO
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  mt: 1, 
                  opacity: 0.9, 
                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, 
                  display: { xs: 'none', sm: 'block' },
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? '#fff' : 'inherit'
                }}
              >
                全局运营监控
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  opacity: 0.8, 
                  fontSize: { xs: '0.625rem', sm: '0.75rem', md: '0.875rem' }, 
                  display: { xs: 'none', sm: 'block' },
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? '#fff' : 'inherit'
                }}
              >
                Executive Dashboard
              </Typography>
              <Button
                variant="contained"
                size="large"
                sx={{ 
                  mt: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 2, sm: 3 },
                  bgcolor: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? 'rgba(255,255,255,0.2)' : 'primary.main',
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? '#fff' : 'inherit',
                  '&:hover': {
                    bgcolor: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理') ? 'rgba(255,255,255,0.3)' : 'primary.dark'
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRoleSelect('ceo')
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