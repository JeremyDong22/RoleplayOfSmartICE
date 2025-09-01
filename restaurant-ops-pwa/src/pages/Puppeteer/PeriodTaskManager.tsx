// Period Task Manager Component
// Displays periods timeline and tasks within each period

import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ImageIcon from '@mui/icons-material/Image'
import ChecklistIcon from '@mui/icons-material/Checklist'
import type { Role, Restaurant, WorkflowPeriod, Task } from '../../types/sampleManager.types'
import { SampleManagerService } from '../../services/sampleManagerService'

interface PeriodTaskManagerProps {
  restaurant: Restaurant
  role: Role
  onEditTask: (task: Task) => void
  onBack: () => void
}

export const PeriodTaskManager: React.FC<PeriodTaskManagerProps> = ({ 
  restaurant, 
  role, 
  onEditTask, 
  onBack 
}) => {
  const [periods, setPeriods] = useState<WorkflowPeriod[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taskDialog, setTaskDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    submission_type: 'photo' as string
  })

  useEffect(() => {
    loadData()
  }, [role.role_code])

  const loadData = async () => {
    try {
      setLoading(true)
      const [periodsData, tasksData] = await Promise.all([
        SampleManagerService.getPeriods(restaurant.id),
        SampleManagerService.getTasks(role.role_code, undefined, restaurant.id)
      ])
      setPeriods(periodsData || [])
      setTasks(tasksData || [])
      
      // Auto-select first period
      if (periodsData && periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].id)
        setExpandedPeriod(periodsData[0].id)
      }
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getTasksForPeriod = (periodId: string) => {
    return tasks.filter(task => task.period_id === periodId)
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return
    
    try {
      await SampleManagerService.deleteTask(taskId)
      setTasks(tasks.filter(t => t.id !== taskId))
    } catch (err) {
      console.error('Failed to delete task:', err)
      alert('删除任务失败')
    }
  }

  const getPeriodColor = (index: number) => {
    const colors = ['#ffc107', '#4caf50', '#2196f3', '#9c27b0', '#f44336']
    return colors[index % colors.length]
  }

  const hasSamples = (task: Task) => {
    return task.samples && task.samples.samples && task.samples.samples.length > 0
  }

  const handleOpenTaskDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task)
      setTaskForm({
        title: task.title,
        description: task.description || '',
        submission_type: task.submission_type || 'photo'
      })
    } else {
      setEditingTask(null)
      setTaskForm({
        title: '',
        description: '',
        submission_type: 'photo'
      })
    }
    setTaskDialog(true)
  }

  const handleCloseTaskDialog = () => {
    setTaskDialog(false)
    setEditingTask(null)
    setTaskForm({
      title: '',
      description: '',
      submission_type: 'photo'
    })
  }

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      alert('请输入任务标题')
      return
    }

    try {
      if (editingTask) {
        // Update existing task
        const updated = await SampleManagerService.updateTask(editingTask.id, {
          title: taskForm.title,
          description: taskForm.description,
          submission_type: taskForm.submission_type
        })
        setTasks(tasks.map(t => t.id === editingTask.id ? updated : t))
      } else {
        // Create new task
        const newTask = await SampleManagerService.createTask({
          title: taskForm.title,
          description: taskForm.description,
          submission_type: taskForm.submission_type,
          role_code: role.role_code,
          period_id: selectedPeriod,
          restaurant_id: restaurant.id
        })
        setTasks([...tasks, newTask])
      }
      handleCloseTaskDialog()
    } catch (err) {
      console.error('Failed to save task:', err)
      alert('保存任务失败')
    }
  }

  const getTaskTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      'photo': '照片',
      'text': '文本',
      'list': '列表',
      'notice-comment': '通知评论'
    }
    return types[type || ''] || '未设置'
  }

  const getTaskTypeColor = (type: string | null) => {
    const colors: Record<string, any> = {
      'photo': 'primary',
      'text': 'secondary', 
      'list': 'info',
      'notice-comment': 'warning'
    }
    return colors[type || ''] || 'default'
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <>
      <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" gutterBottom>
            Puppeteer 任务管理
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip label={restaurant.name} size="small" />
            <Chip label={role.role_name_zh} size="small" color="primary" />
          </Box>
        </Box>
      </Box>

      {/* Period Timeline */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          时间段
        </Typography>
        <Box sx={{ display: 'flex', overflowX: 'auto', gap: 2, pb: 1 }}>
          {periods.map((period, index) => (
            <Card
              key={period.id}
              sx={{
                minWidth: 150,
                cursor: 'pointer',
                borderTop: `4px solid ${getPeriodColor(index)}`,
                backgroundColor: selectedPeriod === period.id ? 'action.selected' : 'background.paper',
                transition: 'all 0.2s'
              }}
              onClick={() => {
                setSelectedPeriod(period.id)
                setExpandedPeriod(expandedPeriod === period.id ? null : period.id)
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight="bold">
                  {period.display_name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {period.start_time.slice(0, 5)} - {period.end_time.slice(0, 5)}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {getTasksForPeriod(period.id).length} 任务
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>

      {/* Tasks in Selected Period */}
      {selectedPeriod && (
        <Paper sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {periods.find(p => p.id === selectedPeriod)?.display_name} 的任务
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              size="small"
              onClick={() => handleOpenTaskDialog()}
            >
              添加任务
            </Button>
          </Box>

          <List>
            {getTasksForPeriod(selectedPeriod).map((task) => (
              <ListItem 
                key={task.id}
                sx={{ 
                  borderLeft: `3px solid ${hasSamples(task) ? '#4caf50' : '#ff9800'}`,
                  mb: 1,
                  backgroundColor: 'background.paper',
                  borderRadius: 1
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">{task.title}</Typography>
                      <Chip
                        label={getTaskTypeLabel(task.submission_type)}
                        size="small"
                        color={getTaskTypeColor(task.submission_type)}
                        variant="outlined"
                      />
                      {hasSamples(task) && (
                        <Box display="flex" gap={0.5}>
                          {task.samples.samples.some((s: any) => s.images?.length > 0) && (
                            <ImageIcon fontSize="small" color="action" />
                          )}
                          {task.samples.samples.some((s: any) => s.checklist) && (
                            <ChecklistIcon fontSize="small" color="action" />
                          )}
                        </Box>
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      {task.description || '暂无描述'}
                      {hasSamples(task) ? (
                        <Chip 
                          label={
                            task.samples.samples.some((s: any) => s.checklist) 
                              ? `${task.samples.samples[0]?.checklist?.items?.length || 0} 个检查项`
                              : `${task.samples.samples.length} 个样本`
                          } 
                          size="small" 
                          color="success"
                          sx={{ mt: 1, display: 'block', width: 'fit-content' }}
                        />
                      ) : (
                        <Chip 
                          label="未设置样本" 
                          size="small" 
                          color="warning"
                          sx={{ mt: 1, display: 'block', width: 'fit-content' }}
                        />
                      )}
                    </>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    onClick={() => handleOpenTaskDialog(task)}
                    color="secondary"
                    size="small"
                    title="编辑任务类型"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => onEditTask(task)}
                    color="primary"
                    size="small"
                    title="编辑样本"
                  >
                    <ImageIcon />
                  </IconButton>
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDeleteTask(task.id)}
                    color="error"
                    size="small"
                    title="删除任务"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {getTasksForPeriod(selectedPeriod).length === 0 && (
            <Box textAlign="center" py={3}>
              <Typography color="textSecondary">
                该时间段暂无任务
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      </Box>

      {/* Task Type Dialog */}
      <Dialog open={taskDialog} onClose={handleCloseTaskDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? '编辑任务' : '添加新任务'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="任务标题"
              fullWidth
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              required
            />
            <TextField
              label="任务描述"
              fullWidth
              multiline
              rows={3}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>任务类型</InputLabel>
              <Select
                value={taskForm.submission_type}
                label="任务类型"
                onChange={(e) => setTaskForm({ ...taskForm, submission_type: e.target.value })}
              >
                <MenuItem value="photo">照片</MenuItem>
                <MenuItem value="text">文本</MenuItem>
                <MenuItem value="list">列表</MenuItem>
                <MenuItem value="notice-comment">通知评论</MenuItem>
              </Select>
              <FormHelperText>选择任务的提交类型</FormHelperText>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTaskDialog}>取消</Button>
          <Button onClick={handleSaveTask} variant="contained">
            {editingTask ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}