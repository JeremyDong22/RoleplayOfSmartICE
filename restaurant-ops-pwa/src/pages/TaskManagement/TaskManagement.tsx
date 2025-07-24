// Task Management page component for staff to view and complete tasks
// Updated to use MUI v7 Grid component with size prop
import type { FC } from 'react'

import { Box, Container, Typography, Paper } from '@mui/material'
import Grid from '@mui/material/Grid'
import { CountdownTimer } from '../../components/Timer/CountdownTimer'

export const TaskManagement: FC = () => {
  const handleTaskAlert = (task: any) => {
    console.log('Task alert:', task)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        任务管理 Task Management
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <CountdownTimer currentTask={null} onTaskAlert={handleTaskAlert} />
        </Grid>
        
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              我的任务 My Tasks
            </Typography>
            {/* Personal task list will be implemented here */}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}