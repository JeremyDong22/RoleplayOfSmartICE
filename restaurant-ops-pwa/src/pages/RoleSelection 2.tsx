// Role selection page for choosing between Manager and Chef
import { useNavigate } from 'react-router-dom'
import { Box, Container, Typography, Paper, Button } from '@mui/material'
import Grid from '@mui/material/Grid'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'

export const RoleSelection = () => {
  const navigate = useNavigate()

  const handleRoleSelect = (role: 'manager' | 'chef') => {
    // Store role in localStorage for persistence
    localStorage.setItem('selectedRole', role)
    navigate(`/dashboard/${role}`)
  }

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom align="center">
          餐厅运营管理系统
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom align="center" sx={{ mb: 6 }}>
          Restaurant Operations Management
        </Typography>
        
        <Typography variant="h6" gutterBottom align="center" sx={{ mb: 4 }}>
          请选择您的角色 / Please select your role
        </Typography>

        <Grid container spacing={4} sx={{ maxWidth: 800 }}>
          <Grid size ={{ xs: 12, md: 6 }}>
            <Paper
              elevation={3}
              sx={{
                p: 4,
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
              <SupervisorAccountIcon sx={{ fontSize: 80, mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                前厅经理
              </Typography>
              <Typography variant="h6" color="inherit">
                Manager
              </Typography>
              <Typography variant="body1" sx={{ mt: 2, opacity: 0.8 }}>
                负责前厅运营管理
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Front-of-house operations
              </Typography>
              <Button
                variant="contained"
                size="large"
                sx={{ mt: 3 }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRoleSelect('manager')
                }}
              >
                选择此角色 / Select
              </Button>
            </Paper>
          </Grid>

          <Grid size ={{ xs: 12, md: 6 }}>
            <Paper
              elevation={3}
              sx={{
                p: 4,
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
              <RestaurantIcon sx={{ fontSize: 80, mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                后厨主管
              </Typography>
              <Typography variant="h6" color="inherit">
                Chef
              </Typography>
              <Typography variant="body1" sx={{ mt: 2, opacity: 0.8 }}>
                负责后厨运营管理
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Kitchen operations
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                sx={{ mt: 3 }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRoleSelect('chef')
                }}
              >
                选择此角色 / Select
              </Button>
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 6 }}>
          选择角色后，系统将显示相应的任务和工作流程
        </Typography>
        <Typography variant="caption" color="text.secondary">
          After selecting a role, the system will display relevant tasks and workflows
        </Typography>
      </Box>
    </Container>
  )
}