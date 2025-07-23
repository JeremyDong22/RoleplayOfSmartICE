// Fixed dashboard with proper MUI Grid and Typography nesting
import { useState, useEffect } from 'react'
import { Box, Container, Typography, Paper, List, ListItem, ListItemText, Chip, AppBar, Toolbar, Grid } from '@mui/material'
import { CountdownTimer } from '../components/Timer/CountdownTimer'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingIcon from '@mui/icons-material/Pending'

// Mock task data based on the workflow
const mockTasks = [
  {
    id: '1',
    title: '更换工作服、佩戴工牌',
    description: '检查门店设备运转情况并查看能源余额情况（水电气）',
    scheduled_start_time: new Date().setHours(10, 0, 0, 0),
    scheduled_end_time: new Date().setHours(10, 10, 0, 0),
    status: 'completed',
    department: '前厅'
  },
  {
    id: '2',
    title: '召集门店伙伴开展早会',
    description: '清点到岗人数，总结问题，安排分工',
    scheduled_start_time: new Date().setHours(10, 10, 0, 0),
    scheduled_end_time: new Date().setHours(10, 20, 0, 0),
    status: 'in_progress',
    department: '前厅'
  },
  {
    id: '3',
    title: '卫生准备',
    description: '吧台、营业区域、卫生间，清洁间的地面、台面、椅面、垃圾篓清洁',
    scheduled_start_time: new Date().setHours(10, 35, 0, 0),
    scheduled_end_time: new Date().setHours(11, 0, 0, 0),
    status: 'pending',
    department: '前厅'
  },
  {
    id: '4',
    title: '收货验货',
    description: '每种原材料上称称重、和送货单核对，误差在±2%以内',
    scheduled_start_time: new Date().setHours(10, 35, 0, 0),
    scheduled_end_time: new Date().setHours(10, 50, 0, 0),
    status: 'pending',
    department: '后厨'
  },
]

export const SimpleDashboardFixed = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentTask, setCurrentTask] = useState<any>(null)

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Find the current or next task
    const now = new Date().getTime()
    const activeTask = mockTasks.find(task => {
      const start = new Date(task.scheduled_start_time).getTime()
      const end = new Date(task.scheduled_end_time).getTime()
      return now >= start && now <= end && task.status !== 'completed'
    })

    const nextTask = mockTasks.find(task => {
      const start = new Date(task.scheduled_start_time).getTime()
      return now < start && task.status === 'pending'
    })

    setCurrentTask(activeTask || nextTask || null)
  }, [currentTime])

  const handleTaskAlert = (task: any) => {
    console.log('Task alert:', task)
    // In a real app, this would show a notification or modal
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />
      case 'in_progress':
        return <PendingIcon color="primary" />
      default:
        return <AccessTimeIcon color="action" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'primary'
      default:
        return 'default'
    }
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            餐厅运营管理系统 - Restaurant Operations Management
          </Typography>
          <Typography variant="body1">
            {currentTime.toLocaleTimeString('zh-CN')}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Countdown Timer */}
          <Grid size={{ xs: 12, md: 6 }}>
            <CountdownTimer currentTask={currentTask} onTaskAlert={handleTaskAlert} />
          </Grid>
          
          {/* Today's Tasks */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h5" gutterBottom>
                今日任务 Today's Tasks
              </Typography>
              <List>
                {mockTasks.map((task) => (
                  <ListItem 
                    key={task.id}
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: task.status === 'in_progress' ? '#e3f2fd' : 'transparent'
                    }}
                  >
                    <Box sx={{ mr: 2 }}>
                      {getStatusIcon(task.status)}
                    </Box>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">{task.title}</Typography>
                          <Chip 
                            label={task.department} 
                            size="small" 
                            color={task.department === '前厅' ? 'primary' : 'secondary'}
                          />
                        </Box>
                      }
                      secondary={
                        <Box component="span">
                          <Typography 
                            component="span" 
                            variant="body2" 
                            color="text.secondary"
                            display="block"
                          >
                            {task.description}
                          </Typography>
                          <Typography 
                            component="span" 
                            variant="caption" 
                            color="text.secondary"
                          >
                            {new Date(task.scheduled_start_time).toLocaleTimeString('zh-CN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {new Date(task.scheduled_end_time).toLocaleTimeString('zh-CN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Typography>
                        </Box>
                      }
                    />
                    <Chip 
                      label={task.status.replace('_', ' ')} 
                      size="small" 
                      color={getStatusColor(task.status) as any}
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          
          {/* Statistics */}
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {mockTasks.filter(t => t.status === 'completed').length}
                  </Typography>
                  <Typography variant="body1">已完成 Completed</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {mockTasks.filter(t => t.status === 'in_progress').length}
                  </Typography>
                  <Typography variant="body1">进行中 In Progress</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="text.secondary">
                    {mockTasks.filter(t => t.status === 'pending').length}
                  </Typography>
                  <Typography variant="body1">待处理 Pending</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </>
  )
}