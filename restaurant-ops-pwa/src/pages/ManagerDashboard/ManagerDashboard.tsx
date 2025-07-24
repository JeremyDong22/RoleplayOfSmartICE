// Manager Dashboard component for front-of-house operations
// Updated to use MUI v7 Grid component with size prop
import type { FC } from 'react'

import { Box, Container, Typography, Paper } from '@mui/material'
import Grid from '@mui/material/Grid'
import { CountdownTimer } from '../../components/Timer/CountdownTimer'

export const ManagerDashboard: FC = () => {
  const handleTaskAlert = (task: any) => {
    console.log('Task alert:', task)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        前厅经理控制台 Manager Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <CountdownTimer currentTask={null} onTaskAlert={handleTaskAlert} />
        </Grid>
        
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              前厅团队 Front-of-House Team
            </Typography>
            {/* Team status will be implemented here */}
          </Paper>
        </Grid>
        
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              今日任务 Today's Tasks
            </Typography>
            {/* Task list will be implemented here */}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}