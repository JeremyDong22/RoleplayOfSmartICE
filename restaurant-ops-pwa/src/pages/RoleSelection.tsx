// Role selection page for choosing between Manager, Chef, and Employee roles
import { useNavigate } from 'react-router-dom'
import { Box, Container, Typography, Paper, Button } from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import PersonIcon from '@mui/icons-material/Person'
import KitchenIcon from '@mui/icons-material/Kitchen'

export const RoleSelection = () => {
  const navigate = useNavigate()

  const handleRoleSelect = (role: 'manager' | 'chef' | 'front-employee' | 'kitchen-employee') => {
    console.log(`[Navigation] Attempting to navigate to: /${role}`)
    
    // Store role in localStorage for persistence
    localStorage.setItem('selectedRole', role)
    
    // Navigate to the selected role page
    navigate(`/${role}`)
    
    console.log(`[Navigation] Navigation called for: /${role}`)
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
        }}
      >
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
            mb: { xs: 2, sm: 4, md: 6 }
          }}
        >
          Restaurant Operations Management
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

        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1000,
            width: '100%',
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {/* Manager Role */}
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
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
                backgroundColor: 'primary.light',
                color: 'white',
              },
            }}
            onClick={() => handleRoleSelect('manager')}
          >
            <SupervisorAccountIcon sx={{ fontSize: { xs: 48, sm: 64, md: 72 }, mb: 1 }} />
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.875rem' } }}>
              前厅经理
            </Typography>
            <Typography variant="h6" color="inherit" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' } }}>
              Manager
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', sm: 'block' } }}>
              负责前厅运营管理
            </Typography>
            <Button
              variant="contained"
              size="medium"
              sx={{ 
                mt: { xs: 1.5, sm: 2 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: 1,
                px: { xs: 2, sm: 3 }
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleRoleSelect('manager')
              }}
            >
              选择 / Select
            </Button>
          </Paper>

          {/* Chef Role */}
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
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
                backgroundColor: 'secondary.light',
                color: 'white',
              },
            }}
            onClick={() => handleRoleSelect('chef')}
          >
            <RestaurantIcon sx={{ fontSize: { xs: 48, sm: 64, md: 72 }, mb: 1 }} />
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.875rem' } }}>
              后厨主管
            </Typography>
            <Typography variant="h6" color="inherit" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' } }}>
              Chef
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', sm: 'block' } }}>
              负责后厨运营管理
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              size="medium"
              sx={{ 
                mt: { xs: 1.5, sm: 2 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: 1,
                px: { xs: 2, sm: 3 }
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleRoleSelect('chef')
              }}
            >
              选择 / Select
            </Button>
          </Paper>

          {/* Front Employee Role */}
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
              backgroundColor: 'background.paper',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
                backgroundColor: 'info.light',
                color: 'white',
              },
            }}
            onClick={() => handleRoleSelect('front-employee')}
          >
            <PersonIcon sx={{ fontSize: { xs: 48, sm: 64, md: 72 }, mb: 1 }} />
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.875rem' } }}>
              前厅员工
            </Typography>
            <Typography variant="h6" color="inherit" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' } }}>
              Front Staff
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', sm: 'block' } }}>
              执行前厅任务
            </Typography>
            <Button
              variant="contained"
              color="info"
              size="medium"
              sx={{ 
                mt: { xs: 1.5, sm: 2 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: 1,
                px: { xs: 2, sm: 3 }
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleRoleSelect('front-employee')
              }}
            >
              选择 / Select
            </Button>
          </Paper>

          {/* Kitchen Employee Role */}
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
              backgroundColor: 'background.paper',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
                backgroundColor: 'warning.light',
                color: 'white',
              },
            }}
            onClick={() => handleRoleSelect('kitchen-employee')}
          >
            <KitchenIcon sx={{ fontSize: { xs: 48, sm: 64, md: 72 }, mb: 1 }} />
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.875rem' } }}>
              后厨员工
            </Typography>
            <Typography variant="h6" color="inherit" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' } }}>
              Kitchen Staff
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', sm: 'block' } }}>
              执行后厨任务
            </Typography>
            <Button
              variant="contained"
              color="warning"
              size="medium"
              sx={{ 
                mt: { xs: 1.5, sm: 2 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: 1,
                px: { xs: 2, sm: 3 }
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleRoleSelect('kitchen-employee')
              }}
            >
              选择 / Select
            </Button>
          </Paper>
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