import React, { useState } from 'react'
import {
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Badge,
  TextField,
  InputAdornment,
  Paper
} from '@mui/material'
import {
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  Restaurant as RestaurantIcon,
  Kitchen as KitchenIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Search as SearchIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import { useTaskData } from '../../contexts/TaskDataContext'
import type { TaskTemplate, WorkflowPeriod } from '../../types/task.types'

interface TaskOverviewDropdownProps {
  testTime?: Date
}

const TaskOverviewDropdown: React.FC<TaskOverviewDropdownProps> = ({ testTime }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedPeriods, setExpandedPeriods] = useState<string[]>([])
  const { workflowPeriods, floatingTasks, isLoading } = useTaskData()
  
  const open = Boolean(anchorEl)
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleClose = () => {
    setAnchorEl(null)
    setSearchTerm('')
  }
  
  const handleAccordionChange = (periodId: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPeriods(isExpanded 
      ? [...expandedPeriods, periodId]
      : expandedPeriods.filter(id => id !== periodId)
    )
  }
  
  // Get current period based on time
  const getCurrentPeriod = (): WorkflowPeriod | null => {
    const now = testTime || new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    return workflowPeriods.find(period => {
      return currentTime >= period.startTime && currentTime < period.endTime
    }) || null
  }
  
  const currentPeriod = getCurrentPeriod()
  
  // Filter tasks based on search term
  const filterTasks = (tasks: TaskTemplate[]) => {
    if (!searchTerm) return tasks
    const lowerSearch = searchTerm.toLowerCase()
    return tasks.filter(task => 
      task.title.toLowerCase().includes(lowerSearch) ||
      task.description.toLowerCase().includes(lowerSearch)
    )
  }
  
  // Get role icon
  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'Manager':
        return <SupervisorAccountIcon fontSize="small" />
      case 'Chef':
        return <KitchenIcon fontSize="small" />
      case 'DutyManager':
        return <PersonIcon fontSize="small" />
      default:
        return <PersonIcon fontSize="small" />
    }
  }
  
  // Get period color
  const getPeriodColor = (periodId: string): string => {
    switch(periodId) {
      case 'opening':
        return '#FFA726' // Orange
      case 'lunch':
        return '#66BB6A' // Green
      case 'dinner':
        return '#42A5F5' // Blue
      case 'pre-closing':
        return '#AB47BC' // Purple
      case 'closing':
        return '#EF5350' // Red
      default:
        return '#9E9E9E' // Grey
    }
  }
  
  // Count total tasks in a period
  const countPeriodTasks = (period: WorkflowPeriod): number => {
    let count = 0
    if (period.tasks.manager) count += period.tasks.manager.filter(t => !t.isNotice).length
    if (period.tasks.chef) count += period.tasks.chef.filter(t => !t.isNotice).length
    if (period.tasks.dutyManager) count += period.tasks.dutyManager.filter(t => !t.isNotice).length
    return count
  }
  
  if (isLoading) {
    return null
  }
  
  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ ml: 1 }}
        aria-label="任务总览"
      >
        <Badge badgeContent={workflowPeriods.length} color="secondary">
          <AssignmentIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 420,
            maxHeight: '80vh',
            overflow: 'auto'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon />
            任务总览
          </Typography>
          
          <TextField
            fullWidth
            size="small"
            placeholder="搜索任务..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ mb: 1 }}
          />
        </Box>
        
        <Divider />
        
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {workflowPeriods.map(period => {
            const isCurrentPeriod = currentPeriod?.id === period.id
            const periodColor = getPeriodColor(period.id)
            const taskCount = countPeriodTasks(period)
            
            return (
              <Accordion
                key={period.id}
                expanded={expandedPeriods.includes(period.id)}
                onChange={handleAccordionChange(period.id)}
                sx={{
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  border: isCurrentPeriod ? `2px solid ${periodColor}` : 'none',
                  backgroundColor: isCurrentPeriod ? `${periodColor}10` : 'transparent'
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '&:hover': { backgroundColor: 'action.hover' },
                    minHeight: 48
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Box
                      sx={{
                        width: 4,
                        height: 24,
                        backgroundColor: periodColor,
                        borderRadius: 1
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {period.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon fontSize="small" sx={{ fontSize: 14 }} />
                        {period.startTime} - {period.endTime}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`${taskCount} 任务`}
                      size="small"
                      color={isCurrentPeriod ? "primary" : "default"}
                      variant={isCurrentPeriod ? "filled" : "outlined"}
                    />
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ pt: 0 }}>
                  {/* Manager Tasks */}
                  {period.tasks.manager && filterTasks(period.tasks.manager).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        {getRoleIcon('Manager')}
                        店长任务
                      </Typography>
                      <List dense sx={{ pl: 2 }}>
                        {filterTasks(period.tasks.manager).map(task => (
                          <ListItem key={task.id} sx={{ py: 0.5, px: 1 }}>
                            <ListItemText
                              primary={
                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <Typography variant="body2" component="span">
                                    {task.title}
                                  </Typography>
                                  {task.isNotice && (
                                    <Chip label="通知" size="small" sx={{ ml: 1, height: 18 }} />
                                  )}
                                  {task.isFloating && (
                                    <Chip label="浮动" size="small" color="info" sx={{ ml: 1, height: 18 }} />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {task.uploadRequirement && `需要: ${task.uploadRequirement}`}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  {/* Chef Tasks */}
                  {period.tasks.chef && filterTasks(period.tasks.chef).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        {getRoleIcon('Chef')}
                        厨师长任务
                      </Typography>
                      <List dense sx={{ pl: 2 }}>
                        {filterTasks(period.tasks.chef).map(task => (
                          <ListItem key={task.id} sx={{ py: 0.5, px: 1 }}>
                            <ListItemText
                              primary={
                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <Typography variant="body2" component="span">
                                    {task.title}
                                  </Typography>
                                  {task.isNotice && (
                                    <Chip label="通知" size="small" sx={{ ml: 1, height: 18 }} />
                                  )}
                                  {task.isFloating && (
                                    <Chip label="浮动" size="small" color="info" sx={{ ml: 1, height: 18 }} />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {task.uploadRequirement && `需要: ${task.uploadRequirement}`}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  {/* Duty Manager Tasks */}
                  {period.tasks.dutyManager && filterTasks(period.tasks.dutyManager).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        {getRoleIcon('DutyManager')}
                        值班经理任务
                      </Typography>
                      <List dense sx={{ pl: 2 }}>
                        {filterTasks(period.tasks.dutyManager).map(task => (
                          <ListItem key={task.id} sx={{ py: 0.5, px: 1 }}>
                            <ListItemText
                              primary={
                                <Typography variant="body2">
                                  {task.title}
                                  {task.isNotice && (
                                    <Chip label="通知" size="small" sx={{ ml: 1, height: 18 }} />
                                  )}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {task.uploadRequirement && `需要: ${task.uploadRequirement}`}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            )
          })}
          
          {/* Floating Tasks Section */}
          {floatingTasks.length > 0 && (
            <Paper sx={{ m: 2, p: 2, backgroundColor: 'info.lighter' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon fontSize="small" />
                浮动任务
              </Typography>
              <List dense>
                {filterTasks(floatingTasks).map(task => (
                  <ListItem key={task.id} sx={{ py: 0.5, px: 1 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2">
                          {task.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {getRoleIcon(task.role)} {task.role === 'Manager' ? '店长' : task.role === 'Chef' ? '厨师长' : '值班经理'}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      </Menu>
    </>
  )
}

export default TaskOverviewDropdown