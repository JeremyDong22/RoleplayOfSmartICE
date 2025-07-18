// Employee Dashboard - Shows task status and allows uploading task completion posts
// Created: Employee role implementation for task verification system
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Container, 
  AppBar, 
  Toolbar, 
  IconButton,
  Typography,
  Box,
  Fab
} from '@mui/material'
import Grid from '@mui/material/Grid'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { TaskCountdown } from '../components/TaskCountdown/TaskCountdown'
import { TaskSummary } from '../components/TaskSummary/TaskSummary'
import { EditableTime } from '../components/TimeControl/EditableTime'
import { ClosedPeriodDisplay } from '../components/ClosedPeriodDisplay/ClosedPeriodDisplay'
import { getCurrentPeriod, getNextPeriod, loadWorkflowPeriods } from '../utils/workflowParser'
import type { WorkflowPeriod, TaskTemplate } from '../utils/workflowParser'
import { saveState, loadState } from '../utils/persistenceManager'
import { PostUploadModal } from '../components/PostUploadModal/PostUploadModal'

interface EmployeeDashboardProps {
  department: '前厅' | '后厨'
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ department }) => {
  const navigate = useNavigate()
  const selectedRole = localStorage.getItem('selectedRole')
  const roleKey = department === '前厅' ? 'front-employee' : 'kitchen-employee'
  
  // Redirect if wrong role
  useEffect(() => {
    if (!selectedRole || (department === '前厅' && selectedRole !== 'front-employee') || 
        (department === '后厨' && selectedRole !== 'kitchen-employee')) {
      navigate('/')
    }
  }, [selectedRole, department, navigate])

  const [testTime, setTestTime] = useState<Date | undefined>(undefined)
  const [currentPeriod, setCurrentPeriod] = useState<WorkflowPeriod | null>(null)
  const [nextPeriod, setNextPeriod] = useState<WorkflowPeriod | null>(null)
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const workflowPeriods = loadWorkflowPeriods()

  // Update current period based on time
  useEffect(() => {
    const updatePeriod = () => {
      const current = getCurrentPeriod(testTime)
      const next = getNextPeriod(testTime)
      
      setCurrentPeriod(current)
      setNextPeriod(next)
    }

    updatePeriod()
    const interval = setInterval(updatePeriod, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [testTime])

  // Load saved state
  useEffect(() => {
    const savedState = loadState(roleKey)
    if (savedState) {
      setCompletedTaskIds(savedState.completedTaskIds || [])
      if (savedState.testTime) {
        setTestTime(new Date(savedState.testTime))
      }
    }
  }, [roleKey])

  // Save state changes
  useEffect(() => {
    saveState(roleKey, {
      completedTaskIds,
      testTime: testTime?.toISOString()
    })
  }, [completedTaskIds, testTime, roleKey])

  const handleTimeChange = (newTime: Date) => {
    setTestTime(newTime)
  }

  const handleBack = () => {
    localStorage.removeItem('selectedRole')
    navigate('/')
  }

  const handleUploadClick = () => {
    setUploadModalOpen(true)
  }

  // Filter tasks for the specific department
  const departmentTasks = currentPeriod ? (
    department === '前厅' ? currentPeriod.tasks.manager : currentPeriod.tasks.chef
  ) : []

  return (
    <>
      <AppBar position="static" color={department === '前厅' ? 'primary' : 'secondary'}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {department}员工
          </Typography>
          <EditableTime 
            testTime={testTime}
            onTimeChange={handleTimeChange}
            periodInfo={currentPeriod ? {
              name: currentPeriod.displayName,
              timeRange: `${currentPeriod.startTime}-${currentPeriod.endTime}`
            } : undefined}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 3, mb: 10 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            {currentPeriod ? (
              <TaskCountdown
                period={currentPeriod}
                nextPeriod={nextPeriod}
                tasks={departmentTasks}
                completedTaskIds={completedTaskIds}
                onTaskComplete={(taskId) => {
                  // Employees cannot directly complete tasks
                  console.log('Task completion not allowed for employees')
                }}
                onTaskSkip={(taskId) => {
                  // Employees cannot skip tasks
                  console.log('Task skip not allowed for employees')
                }}
                currentTime={testTime || new Date()}
                role={department === '前厅' ? 'Manager' : 'Chef'}
              />
            ) : (
              <ClosedPeriodDisplay
                nextPeriod={nextPeriod}
                currentTime={testTime || new Date()}
              />
            )}
          </Grid>
          
          <Grid size={{ xs: 12, md: 4 }}>
            <TaskSummary
              allPeriods={workflowPeriods}
              currentPeriod={currentPeriod}
              completedTaskIds={completedTaskIds}
              currentTime={testTime || new Date()}
              role={department === '前厅' ? 'Manager' : 'Chef'}
            />
          </Grid>
        </Grid>
      </Container>

      {/* Floating Upload Button */}
      <Fab
        color={department === '前厅' ? 'primary' : 'secondary'}
        aria-label="upload"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
        }}
        onClick={handleUploadClick}
      >
        <CloudUploadIcon sx={{ fontSize: 28 }} />
      </Fab>

      {/* Post Upload Modal */}
      {currentPeriod && (
        <PostUploadModal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          tasks={departmentTasks}
          currentPeriodId={currentPeriod.id}
          currentRole={department === '前厅' ? 'front-employee' : 'kitchen-employee'}
          department={department}
        />
      )}
    </>
  )
}