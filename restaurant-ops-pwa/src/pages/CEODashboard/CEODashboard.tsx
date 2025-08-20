// CEO Dashboard component with hierarchical view of all operations
// Updated to use MUI v7 Grid component with size prop
import type { FC } from 'react'

import { Box, Container, Typography, Paper } from '@mui/material'
import Grid from '@mui/material/Grid'
import { CountdownTimer } from '../../components/Timer/CountdownTimer'

export const CEODashboard: FC = () => {
  const handleTaskAlert = (task: any) => {
    console.log('Task alert:', task)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        CEO Dashboard - 总裁控制台
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <CountdownTimer currentTask={null} onTaskAlert={handleTaskAlert} />
        </Grid>
        
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              团队概览 Team Overview
            </Typography>
            {/* Team hierarchy view will be implemented here */}
          </Paper>
        </Grid>
        
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              实时任务状态 Real-time Task Status
            </Typography>
            {/* Real-time task status will be implemented here */}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}