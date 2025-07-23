/**
 * 数据库任务测试页面
 * 用于验证任务数据是否正确从数据库加载
 */

import React, { useState } from 'react'
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Paper,
  Divider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Tab,
  Tabs
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useTaskData } from '../contexts/TaskDataContext'
import { supabase } from '../services/supabase'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export const TestDatabase: React.FC = () => {
  const navigate = useNavigate()
  const { workflowPeriods, floatingTasks, isLoading, error, refresh } = useTaskData()
  const [tabValue, setTabValue] = useState(0)
  const [testResult, setTestResult] = useState<string>('')
  const [testing, setTesting] = useState(false)

  // 测试数据库连接
  const testDatabaseConnection = async () => {
    setTesting(true)
    setTestResult('')
    
    try {
      // 测试基本查询
      const { data: tasks, error: taskError } = await supabase
        .from('roleplay_tasks')
        .select('*')
        .limit(5)
      
      if (taskError) {
        setTestResult(`❌ 数据库连接失败: ${taskError.message}`)
        return
      }
      
      // 测试期间查询
      const { data: periods, error: periodError } = await supabase
        .from('roleplay_workflow_periods')
        .select('*')
        .order('display_order')
      
      if (periodError) {
        setTestResult(`❌ 期间查询失败: ${periodError.message}`)
        return
      }
      
      setTestResult(`✅ 数据库连接成功！
        - 任务表记录数: ${tasks?.length || 0}
        - 期间表记录数: ${periods?.length || 0}
        - Realtime 状态: 已连接`)
      
    } catch (err) {
      setTestResult(`❌ 测试失败: ${err}`)
    } finally {
      setTesting(false)
    }
  }

  // 测试实时更新
  const testRealtimeUpdate = async () => {
    setTesting(true)
    setTestResult('正在测试实时更新...')
    
    try {
      // 创建一个测试任务
      const testTask = {
        task_code: `test_${Date.now()}`,
        task_name: '测试任务 - 实时更新',
        task_description: '这是一个测试任务，用于验证实时更新',
        role_code: 'manager',
        department: '前厅',
        period_id: 'opening',
        is_notice: false,
        is_floating: false,
        auto_generated: false,
        sort_order: 999
      }
      
      // 插入任务
      const { error: insertError } = await supabase
        .from('roleplay_tasks')
        .insert(testTask)
      
      if (insertError) {
        setTestResult(`❌ 插入测试任务失败: ${insertError.message}`)
        return
      }
      
      setTestResult('✅ 测试任务已创建，请查看任务列表是否自动更新')
      
      // 5秒后删除测试任务
      setTimeout(async () => {
        const { error: deleteError } = await supabase
          .from('roleplay_tasks')
          .delete()
          .eq('task_code', testTask.task_code)
        
        if (!deleteError) {
          setTestResult(prev => prev + '\n✅ 测试任务已删除')
        }
      }, 5000)
      
    } catch (err) {
      setTestResult(`❌ 实时更新测试失败: ${err}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">数据库任务测试</Typography>
        <Button variant="outlined" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </Box>

      {/* 状态显示 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">连接状态</Typography>
          {isLoading && <CircularProgress size={20} />}
          {!isLoading && !error && <CheckCircleIcon color="success" />}
          {error && <ErrorIcon color="error" />}
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`期间数量: ${workflowPeriods.length}`} />
          <Chip label={`浮动任务: ${floatingTasks.length}`} />
          <Chip label={`总任务数: ${workflowPeriods.reduce((acc, p) => 
            acc + (p.tasks.manager?.length || 0) + (p.tasks.chef?.length || 0) + (p.tasks.dutyManager?.length || 0), 0)}`} 
          />
        </Box>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />} 
            onClick={refresh}
            disabled={isLoading}
          >
            刷新数据
          </Button>
          <Button 
            variant="outlined" 
            onClick={testDatabaseConnection}
            disabled={testing}
          >
            测试连接
          </Button>
          <Button 
            variant="outlined" 
            onClick={testRealtimeUpdate}
            disabled={testing}
          >
            测试实时更新
          </Button>
        </Box>
        
        {testResult && (
          <Alert severity="info" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
            {testResult}
          </Alert>
        )}
      </Paper>

      {/* 数据展示 */}
      <Paper sx={{ p: 0 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="工作流期间" />
          <Tab label="浮动任务" />
          <Tab label="任务详情" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <List>
            {workflowPeriods.map((period) => (
              <Box key={period.id}>
                <ListItem>
                  <ListItemText
                    primary={`${period.displayName} (${period.startTime} - ${period.endTime})`}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          经理任务: {period.tasks.manager?.length || 0} | 
                          厨师任务: {period.tasks.chef?.length || 0} | 
                          值班经理: {period.tasks.dutyManager?.length || 0}
                        </Typography>
                        {period.isEventDriven && (
                          <Chip label="事件驱动" size="small" color="info" sx={{ mt: 1 }} />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                <Divider />
              </Box>
            ))}
          </List>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <List>
            {floatingTasks.map((task) => (
              <Box key={task.id}>
                <ListItem>
                  <ListItemText
                    primary={task.title}
                    secondary={
                      <Box>
                        <Typography variant="body2">{task.description}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={task.role} size="small" />
                          <Chip label={task.department} size="small" />
                          {task.floatingType && <Chip label={task.floatingType} size="small" color="secondary" />}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                <Divider />
              </Box>
            ))}
          </List>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          {workflowPeriods.map((period) => (
            <Box key={period.id} sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>{period.displayName}</Typography>
              
              {period.tasks.manager && period.tasks.manager.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary">经理任务</Typography>
                  {period.tasks.manager.map((task) => (
                    <Box key={task.id} sx={{ ml: 2, mb: 1 }}>
                      <Typography variant="body2">
                        • {task.title}
                        {task.uploadRequirement && <Chip label={task.uploadRequirement} size="small" sx={{ ml: 1 }} />}
                        {task.isNotice && <Chip label="通知" size="small" color="warning" sx={{ ml: 1 }} />}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              
              {period.tasks.chef && period.tasks.chef.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="secondary">厨师任务</Typography>
                  {period.tasks.chef.map((task) => (
                    <Box key={task.id} sx={{ ml: 2, mb: 1 }}>
                      <Typography variant="body2">
                        • {task.title}
                        {task.uploadRequirement && <Chip label={task.uploadRequirement} size="small" sx={{ ml: 1 }} />}
                        {task.isNotice && <Chip label="通知" size="small" color="warning" sx={{ ml: 1 }} />}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              
              <Divider />
            </Box>
          ))}
        </TabPanel>
      </Paper>
    </Container>
  )
}