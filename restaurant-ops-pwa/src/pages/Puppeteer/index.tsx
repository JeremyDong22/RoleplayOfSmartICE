// Puppeteer Main Component
// Orchestrates the puppeteer task management flow

import React, { useState } from 'react'
import { Box, Container, ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { RestaurantSelector } from './RestaurantSelector'
import { RoleSelector } from './RoleSelector'
import { PeriodTaskManager } from './PeriodTaskManager'
import { SampleEditor } from './SampleEditor'
import type { Restaurant, Role, Task } from '../../types/sampleManager.types'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#ff9800',
    },
  },
})

type ViewState = 'restaurant' | 'role' | 'tasks' | 'editor'

export const Puppeteer: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('restaurant')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setCurrentView('role')
  }

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
    setCurrentView('tasks')
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setCurrentView('editor')
  }

  const handleBackFromRole = () => {
    setCurrentView('restaurant')
    setSelectedRestaurant(null)
  }

  const handleBackFromTasks = () => {
    setCurrentView('role')
    setSelectedRole(null)
  }

  const handleBackFromEditor = () => {
    setCurrentView('tasks')
    setEditingTask(null)
  }

  const handleSaveTask = (task: Task) => {
    setCurrentView('tasks')
    setEditingTask(null)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl">
        <Box sx={{ minHeight: '100vh', py: 2 }}>
          {currentView === 'restaurant' && (
            <RestaurantSelector onSelect={handleRestaurantSelect} />
          )}

          {currentView === 'role' && selectedRestaurant && (
            <RoleSelector 
              restaurant={selectedRestaurant}
              onSelect={handleRoleSelect}
              onBack={handleBackFromRole}
            />
          )}

          {currentView === 'tasks' && selectedRestaurant && selectedRole && (
            <PeriodTaskManager
              restaurant={selectedRestaurant}
              role={selectedRole}
              onEditTask={handleEditTask}
              onBack={handleBackFromTasks}
            />
          )}

          {currentView === 'editor' && editingTask && selectedRestaurant && selectedRole && (
            <SampleEditor
              task={editingTask}
              restaurant={selectedRestaurant}
              role={selectedRole}
              onBack={handleBackFromEditor}
              onSave={handleSaveTask}
            />
          )}
        </Box>
      </Container>
    </ThemeProvider>
  )
}