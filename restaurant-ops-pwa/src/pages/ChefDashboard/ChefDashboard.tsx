// Chef Dashboard component for kitchen operations
import type { FC } from 'react'

import { Box, Container, Typography, Grid, Paper } from '@mui/material'
import { CountdownTimer } from '../../components/Timer/CountdownTimer'

export const ChefDashboard: FC = () => {
  const handleTaskAlert = (task: any) => {
    console.log('Task alert:', task)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        后厨主管控制台 Chef Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <CountdownTimer currentTask={null} onTaskAlert={handleTaskAlert} />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              后厨团队 Kitchen Team
            </Typography>
            {/* Team status will be implemented here */}
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
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