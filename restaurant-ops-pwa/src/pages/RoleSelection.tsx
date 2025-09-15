// Role selection page for choosing between Manager, Chef, Duty Manager and CEO
// Updated: 2025-07-24 - Added authentication check for role access
// Updated: 2025-08-04 - Added CEO role selection
// Updated: 2025-09-04 - Added restaurant details display (name, address, city)
import { useNavigate } from 'react-router-dom'
import { Box, Container, Typography, Paper, Button, Alert, IconButton, Card, CardContent } from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import NightlightIcon from '@mui/icons-material/Nightlight'
import LogoutIcon from '@mui/icons-material/Logout'
import BusinessIcon from '@mui/icons-material/Business'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { authService } from '../services/authService'
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

interface RestaurantInfo {
  name: string
  address: string
  city: string
}

export const RoleSelection = () => {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null)
  const currentUser = authService.getCurrentUser()
  
  // Check if user is administrator
  const isAdministrator = currentUser?.roleCode === 'administrator'
  
  // Fetch restaurant information
  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      if (!currentUser?.username) return
      
      try {
        // Fetch user's restaurant information
        const { data, error } = await supabase
          .from('roleplay_users')
          .select(`
            restaurant_id,
            roleplay_restaurants (
              name,
              address,
              city
            )
          `)
          .eq('username', currentUser.username)
          .eq('is_active', true)
          .single()
        
        if (error) {
          console.error('Error fetching restaurant info:', error)
          return
        }
        
        if (data?.roleplay_restaurants) {
          setRestaurantInfo({
            name: data.roleplay_restaurants.name || '未知餐厅',
            address: data.roleplay_restaurants.address || '未知地址',
            city: data.roleplay_restaurants.city || '未知城市'
          })
        }
      } catch (err) {
        console.error('Failed to fetch restaurant info:', err)
      }
    }
    
    fetchRestaurantInfo()
  }, [currentUser?.username])
  
  // Debug: Log current user info

  const handleRoleSelect = (role: 'manager' | 'chef' | 'duty-manager' | 'ceo' | 'puppeteer') => {
    
    // Check if user has permission to access this role
    const roleCodeMap: Record<string, string> = {
      'manager': 'manager',
      'chef': 'chef',
      'duty-manager': 'duty_manager',
      'ceo': 'ceo',
      'puppeteer': 'puppeteer'
    }
    
    const requiredRole = roleCodeMap[role]
    
    // Administrator can access all roles
    if (currentUser?.roleCode === 'administrator') {
      // Store both the selected role and that it's an admin viewing this role
      localStorage.setItem('selectedRole', role)
      localStorage.setItem('isAdministratorMode', 'true')
      window.location.href = `/${role}`
      return
    }
    
    // Special handling for CEO role - also check if role name is "总经理"
    if (role === 'ceo') {
      if (currentUser?.roleCode !== 'ceo' && currentUser?.role !== '总经理') {
        setError(`您没有权限访问此角色。您的角色是：${currentUser?.role}`)
        return
      }
    // Puppeteer is accessible to all users
    } else if (role === 'puppeteer') {
      // Everyone can access Puppeteer
    } else if (currentUser?.roleCode !== requiredRole) {
      setError(`您没有权限访问此角色。您的角色是：${currentUser?.role}`)
      return
    }
    
    // Store role in localStorage for persistence
    localStorage.setItem('selectedRole', role)
    localStorage.setItem('isAdministratorMode', 'false')

    // Navigate to the selected role page and reload to ensure data loads
    window.location.href = `/${role}`
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
          sx={{ mb: 1 }}
        >
          欢迎，{currentUser?.name} ({currentUser?.role})
        </Typography>
        
        {/* Restaurant info card */}
        {restaurantInfo && (
          <Card 
            sx={{ 
              mb: 3, 
              maxWidth: 600, 
              width: '100%',
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              border: '1px solid rgba(25, 118, 210, 0.3)'
            }}
          >
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <StorefrontIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    {restaurantInfo.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOnIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  <Typography variant="body2" color="text.secondary">
                    {restaurantInfo.city} · {restaurantInfo.address}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
        
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
              md: 'repeat(3, 1fr)',
              lg: 'repeat(5, 1fr)' 
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
                cursor: (currentUser?.roleCode === 'manager' || isAdministrator) ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (currentUser?.roleCode === 'manager' || isAdministrator) ? 1 : 0.5,
                '&:hover': (currentUser?.roleCode === 'manager' || isAdministrator) ? {
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
                cursor: (currentUser?.roleCode === 'chef' || isAdministrator) ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (currentUser?.roleCode === 'chef' || isAdministrator) ? 1 : 0.5,
                '&:hover': (currentUser?.roleCode === 'chef' || isAdministrator) ? {
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
                cursor: (currentUser?.roleCode === 'duty_manager' || isAdministrator) ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (currentUser?.roleCode === 'duty_manager' || isAdministrator) ? 1 : 0.5,
                '&:hover': (currentUser?.roleCode === 'duty_manager' || isAdministrator) ? {
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
                cursor: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? 1 : 0.5,
                background: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? 
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                  'inherit',
                '&:hover': (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? {
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
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? '#fff' : 'inherit'
                }} 
              />
              <Typography 
                variant="h4" 
                gutterBottom 
                sx={{ 
                  fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' },
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? '#fff' : 'inherit'
                }}
              >
                首席执行官
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? '#fff' : 'inherit'
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
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? '#fff' : 'inherit'
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
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? '#fff' : 'inherit'
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
                  bgcolor: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? 'rgba(255,255,255,0.2)' : 'primary.main',
                  color: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? '#fff' : 'inherit',
                  '&:hover': {
                    bgcolor: (currentUser?.roleCode === 'ceo' || currentUser?.role === '总经理' || isAdministrator) ? 'rgba(255,255,255,0.3)' : 'primary.dark'
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

          {/* Puppeteer Role Card */}
          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 2, sm: 3, md: 4 },
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 8,
                  background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                },
              }}
              onClick={() => handleRoleSelect('puppeteer')}
            >
              <SmartToyIcon 
                sx={{ 
                  fontSize: { xs: 48, sm: 64, md: 80 }, 
                  mb: 1,
                  color: '#fff'
                }} 
              />
              <Typography 
                variant="h4" 
                gutterBottom 
                sx={{ 
                  fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' },
                  color: '#fff'
                }}
              >
                Puppeteer
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
                  color: '#fff'
                }}
              >
                任务样本管理
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  mt: 1, 
                  opacity: 0.9, 
                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, 
                  display: { xs: 'none', sm: 'block' },
                  color: '#fff'
                }}
              >
                管理任务样本和参考资料
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  opacity: 0.8, 
                  fontSize: { xs: '0.625rem', sm: '0.75rem', md: '0.875rem' }, 
                  display: { xs: 'none', sm: 'block' },
                  color: '#fff'
                }}
              >
                Task Sample Management
              </Typography>
              <Button
                variant="contained"
                size="large"
                sx={{ 
                  mt: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 2, sm: 3 },
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)'
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRoleSelect('puppeteer')
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