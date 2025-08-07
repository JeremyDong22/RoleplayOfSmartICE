// CEO Dashboard - 优化版本：单餐厅视图+任务交互
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  ImageList,
  ImageListItem,
  Paper,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Popper,
  Fade,
  ClickAwayListener,
  Alert,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Circle as CircleIcon,
  RadioButtonUnchecked as EmptyCircleIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Image as ImageIcon,
  TextFields as TextIcon,
  List as ListIcon,
  Close as CloseIcon,
  Restaurant as RestaurantIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  ArrowForward as ArrowForwardIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 动画组件
const MotionCard = motion(Card);
const MotionBox = motion(Box);

// 任务类型图标映射
const taskTypeIcons: Record<string, React.ReactElement> = {
  text: <TextIcon fontSize="small" />,
  photo: <ImageIcon fontSize="small" />,
  list: <ListIcon fontSize="small" />,
  none: <CheckCircleIcon fontSize="small" />
};

// 任务类型颜色映射
const taskTypeColors: Record<string, string> = {
  text: '#2196F3',
  photo: '#4CAF50',
  list: '#FF9800',
  none: '#9E9E9E'
};

interface TaskDetail {
  id: string;
  task_id: string;
  task_title: string;
  user_name: string;
  role_name: string;
  submission_type: string;
  text_content?: string;
  photo_urls?: string[];
  submission_metadata?: any;
  created_at: string;
  is_late: boolean;
  has_errors?: boolean;
  scheduled_time?: string;
  actual_time?: string;
}

interface TaskRecord {
  id: string;
  task_id: string;
  task_title: string;
  user_name: string;
  role_code: string;
  submission_type: string;
  text_content?: string;
  photo_urls?: string[];
  submission_metadata?: any;
  created_at: string;
  is_late: boolean;
  has_errors?: boolean;
}

interface RestaurantData {
  restaurant_id: string;
  restaurant_name: string;
  total_tasks: number;
  completed_tasks: number;
  on_time_rate: number;
  current_period: string;
  recent_records: TaskRecord[];
  employee_stats: EmployeeStat[];
  task_details: TaskDetail[];
}

interface EmployeeStat {
  user_id: string;
  user_name: string;
  role_name: string;
  completed_tasks: number;
  total_tasks: number;
  on_time_rate: number;
}

interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info';
  restaurant_id: string;
  restaurant_name: string;
  message: string;
  timestamp: string;
}

export const CEODashboard: React.FC = () => {
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState('');
  
  // 任务交互状态
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [taskPopperAnchor, setTaskPopperAnchor] = useState<null | HTMLElement>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 获取当前时间段
  const getCurrentPeriod = async () => {
    const { data } = await supabase
      .rpc('get_current_period')
      .single();
    
    if (data) {
      setCurrentPeriod(data.display_name || '');
    }
  };

  // 获取餐厅任务数据
  const fetchRestaurantData = async () => {
    try {
      // 获取今天的营业时间范围
      const today = new Date();
      const startHour = 10;
      let startDate = new Date(today);
      startDate.setHours(startHour, 0, 0, 0);
      
      if (today.getHours() < startHour) {
        startDate.setDate(startDate.getDate() - 1);
      }

      // 获取所有餐厅
      const { data: restaurantsData } = await supabase
        .from('roleplay_restaurants')
        .select('*')
        .eq('is_active', true);

      if (!restaurantsData) return;

      const restaurantDataList: RestaurantData[] = [];
      const alertsList: AlertItem[] = [];

      for (const restaurant of restaurantsData) {
        // 获取餐厅的总任务数
        const { data: tasksData } = await supabase
          .from('roleplay_tasks')
          .select('*')
          .in('role_code', ['chef', 'manager'])
          .eq('is_active', true);

        const restaurantTotalTasks = tasksData?.length || 0;

        // 获取今天的任务记录
        const { data: records } = await supabase
          .from('roleplay_task_records')
          .select(`
            *,
            roleplay_tasks!inner(title, description, submission_type),
            roleplay_users!inner(full_name, role_id),
            roleplay_roles!roleplay_users_role_id_fkey(role_name_zh)
          `)
          .eq('restaurant_id', restaurant.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        const completedCount = records?.filter(r => r.status === 'completed').length || 0;
        const onTimeCount = records?.filter(r => r.status === 'completed' && !r.is_late).length || 0;
        const onTimeRate = completedCount > 0 ? (onTimeCount / completedCount) * 100 : 100;

        // 生成任务详情
        const taskDetails: TaskDetail[] = (records || []).map(record => ({
          id: record.id,
          task_id: record.task_id,
          task_title: record.roleplay_tasks.title,
          user_name: record.roleplay_users.full_name,
          role_name: record.roleplay_roles?.role_name_zh || '',
          submission_type: record.submission_type || record.roleplay_tasks.submission_type,
          text_content: record.text_content,
          photo_urls: record.photo_urls,
          submission_metadata: record.submission_metadata,
          created_at: record.created_at,
          is_late: record.is_late,
          has_errors: record.submission_type === 'list' && record.submission_metadata?.checklist?.some((item: any) => 
            item.status === 'fail' || item.status === 'error'
          ),
          scheduled_time: record.scheduled_start,
          actual_time: record.actual_complete
        }));

        // 生成员工统计
        const employeeMap = new Map<string, EmployeeStat>();
        records?.forEach(record => {
          const userId = record.user_id;
          if (!employeeMap.has(userId)) {
            employeeMap.set(userId, {
              user_id: userId,
              user_name: record.roleplay_users.full_name,
              role_name: record.roleplay_roles?.role_name_zh || '',
              completed_tasks: 0,
              total_tasks: 0,
              on_time_rate: 100
            });
          }
          const stat = employeeMap.get(userId)!;
          stat.total_tasks++;
          if (record.status === 'completed') {
            stat.completed_tasks++;
          }
        });

        // 计算每个员工的准时率
        employeeMap.forEach(stat => {
          const userRecords = records?.filter(r => r.user_id === stat.user_id && r.status === 'completed') || [];
          const onTime = userRecords.filter(r => !r.is_late).length;
          stat.on_time_rate = userRecords.length > 0 ? (onTime / userRecords.length) * 100 : 100;
        });

        const employeeStats = Array.from(employeeMap.values())
          .sort((a, b) => b.completed_tasks - a.completed_tasks);

        // 生成警告
        const lateTasksCount = records?.filter(r => r.is_late).length || 0;
        if (lateTasksCount > 0) {
          alertsList.push({
            id: `${restaurant.id}-late`,
            type: 'warning',
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            message: `${restaurant.name}今日有${lateTasksCount}个任务延迟`,
            timestamp: new Date().toISOString()
          });
        }

        // 检查错误任务
        const errorTasks = taskDetails.filter(t => t.has_errors);
        if (errorTasks.length > 0) {
          alertsList.push({
            id: `${restaurant.id}-error`,
            type: 'error',
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            message: `${restaurant.name}有${errorTasks.length}个任务存在质量问题`,
            timestamp: new Date().toISOString()
          });
        }

        restaurantDataList.push({
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          total_tasks: restaurantTotalTasks,
          completed_tasks: completedCount,
          on_time_rate: onTimeRate,
          current_period: currentPeriod,
          recent_records: taskDetails.slice(0, 5),
          employee_stats: employeeStats,
          task_details: taskDetails
        });
      }

      setRestaurants(restaurantDataList);
      setAlerts(alertsList);
      
      // 设置默认选中的餐厅
      if (!selectedRestaurantId && restaurantDataList.length > 0) {
        setSelectedRestaurantId(restaurantDataList[0].restaurant_id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentPeriod();
    fetchRestaurantData();
    
    const interval = setInterval(() => {
      fetchRestaurantData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // 获取当前选中的餐厅数据
  const currentRestaurant = restaurants.find(r => r.restaurant_id === selectedRestaurantId);

  // 处理餐厅切换
  const handleRestaurantChange = (event: React.MouseEvent<HTMLElement>, newRestaurantId: string | null) => {
    if (newRestaurantId) {
      setSelectedRestaurantId(newRestaurantId);
    }
  };

  // 处理警告点击
  const handleAlertClick = (alert: AlertItem) => {
    setSelectedRestaurantId(alert.restaurant_id);
  };

  // 处理任务点击
  const handleTaskDotClick = (event: React.MouseEvent<HTMLElement>, task: TaskDetail) => {
    setTaskPopperAnchor(event.currentTarget);
    setSelectedTask(task);
  };

  // 处理气泡点击
  const handlePopperClick = () => {
    setShowDetailDialog(true);
    setTaskPopperAnchor(null);
  };

  // 任务点阵组件
  const TaskDots = ({ tasks, totalTasks }: { tasks: TaskDetail[], totalTasks: number }) => {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {Array.from({ length: totalTasks }).map((_, index) => {
          const task = tasks[index];
          const isCompleted = index < tasks.filter(t => t.user_name).length;
          const isLate = task?.is_late;
          const hasError = task?.has_errors;
          
          return (
            <Tooltip 
              key={index}
              title={task ? `${task.task_title} - ${task.user_name}` : '待完成'}
              arrow
            >
              <Box
                component={motion.div}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.02 }}
                onClick={(e) => task && handleTaskDotClick(e, task)}
                sx={{ cursor: task ? 'pointer' : 'default' }}
              >
                {isCompleted ? (
                  hasError ? (
                    <ErrorIcon sx={{ fontSize: 16, color: '#f44336' }} />
                  ) : isLate ? (
                    <WarningIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                  ) : (
                    <CircleIcon sx={{ fontSize: 16, color: '#4CAF50' }} />
                  )
                ) : (
                  <EmptyCircleIcon sx={{ fontSize: 16, color: '#E0E0E0' }} />
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    );
  };

  // 动态记录组件
  const RecordItem = ({ record }: { record: TaskRecord }) => {
    const bgColor = record.has_errors ? '#ffebee' : '#f5f5f5';
    const borderColor = record.has_errors ? '#f44336' : 'transparent';

    return (
      <MotionBox
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        sx={{
          p: 1.5,
          mb: 1,
          bgcolor: bgColor,
          borderRadius: 2,
          border: `1px solid ${borderColor}`,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: record.has_errors ? '#ffcdd2' : '#eeeeee'
          }
        }}
        onClick={() => {
          const task = currentRestaurant?.task_details.find(t => t.id === record.id);
          if (task) {
            setSelectedTask(task);
            setShowDetailDialog(true);
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 24, height: 24, bgcolor: taskTypeColors[record.submission_type] }}>
            {taskTypeIcons[record.submission_type]}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
              {record.task_title}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              {record.user_name} · {format(new Date(record.created_at), 'HH:mm', { locale: zhCN })}
            </Typography>
          </Box>
          {record.is_late && <Chip label="迟到" size="small" color="warning" />}
          {record.has_errors && <WarningIcon sx={{ fontSize: 16, color: '#f44336' }} />}
        </Box>
      </MotionBox>
    );
  };

  // 任务详情对话框
  const TaskDetailDialog = () => {
    if (!selectedTask) return null;

    return (
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: taskTypeColors[selectedTask.submission_type] }}>
                {taskTypeIcons[selectedTask.submission_type]}
              </Avatar>
              <Box>
                <Typography variant="h6">{selectedTask.task_title}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {selectedTask.user_name} ({selectedTask.role_name}) · {format(new Date(selectedTask.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setShowDetailDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* 时间信息 */}
          {selectedTask.scheduled_time && (
            <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2">
                计划时间：{format(new Date(selectedTask.scheduled_time), 'HH:mm')}
                {selectedTask.actual_time && ` | 实际完成：${format(new Date(selectedTask.actual_time), 'HH:mm')}`}
                {selectedTask.is_late && <Chip label="延迟提交" size="small" color="warning" sx={{ ml: 1 }} />}
              </Typography>
            </Box>
          )}

          {/* 文本内容 */}
          {selectedTask.submission_type === 'text' && selectedTask.text_content && (
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography>{selectedTask.text_content}</Typography>
            </Paper>
          )}

          {/* 图片内容 */}
          {selectedTask.submission_type === 'photo' && selectedTask.photo_urls && (
            <ImageList cols={2} gap={8}>
              {selectedTask.photo_urls.map((url, index) => (
                <ImageListItem key={index}>
                  <img
                    src={url}
                    alt={`图片 ${index + 1}`}
                    loading="lazy"
                    style={{ borderRadius: 8, maxHeight: 300, objectFit: 'cover' }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          )}

          {/* 列表内容 */}
          {selectedTask.submission_type === 'list' && selectedTask.submission_metadata?.checklist && (
            <Box>
              {selectedTask.submission_metadata.checklist.map((item: any, index: number) => (
                <Box
                  key={index}
                  sx={{
                    p: 1.5,
                    mb: 1,
                    bgcolor: item.status === 'pass' ? '#e8f5e9' : '#ffebee',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  {item.status === 'pass' ? (
                    <CheckCircleIcon sx={{ color: '#4CAF50' }} />
                  ) : (
                    <WarningIcon sx={{ color: '#f44336' }} />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">{item.title}</Typography>
                    {item.note && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        备注：{item.note}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
      {/* 简化的Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        color: 'white',
        py: 3,
        px: 3
      }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          餐厅运营总览
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          实时数据监控 · {format(new Date(), 'yyyy-MM-dd HH:mm')}
        </Typography>
      </Box>

      {/* Alert Banner区域 */}
      {alerts.length > 0 && (
        <Box sx={{ px: 3, py: 2, bgcolor: 'background.paper', borderBottom: '1px solid #e0e0e0' }}>
          <Stack spacing={1}>
            {alerts.map(alert => (
              <Alert
                key={alert.id}
                severity={alert.type}
                action={
                  <IconButton
                    color="inherit"
                    size="small"
                    onClick={() => handleAlertClick(alert)}
                  >
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                }
                sx={{ cursor: 'pointer' }}
                onClick={() => handleAlertClick(alert)}
              >
                <strong>{alert.restaurant_name}</strong> - {alert.message}
              </Alert>
            ))}
          </Stack>
        </Box>
      )}

      {/* 餐厅切换栏 */}
      <Box sx={{ px: 3, py: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <ToggleButtonGroup
          value={selectedRestaurantId}
          exclusive
          onChange={handleRestaurantChange}
          aria-label="restaurant selection"
          sx={{ width: '100%' }}
        >
          {restaurants.map(restaurant => (
            <ToggleButton 
              key={restaurant.restaurant_id} 
              value={restaurant.restaurant_id}
              sx={{ flex: 1 }}
            >
              <RestaurantIcon sx={{ mr: 1 }} />
              {restaurant.restaurant_name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* 主内容区域 */}
      {currentRestaurant && (
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {/* 左侧：任务完成情况 */}
            <MotionCard
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    任务完成情况
                  </Typography>
                  <Chip label={currentRestaurant.current_period} color="primary" size="small" />
                </Box>

                {/* 任务点阵 */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      任务进度
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {currentRestaurant.completed_tasks}/{currentRestaurant.total_tasks}
                    </Typography>
                  </Box>
                  <TaskDots 
                    tasks={currentRestaurant.task_details} 
                    totalTasks={currentRestaurant.total_tasks} 
                  />
                </Box>

                {/* 进度条 */}
                <Box sx={{ mb: 3 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(currentRestaurant.completed_tasks / currentRestaurant.total_tasks) * 100} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: '#E0E0E0',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: currentRestaurant.on_time_rate >= 90 ? '#4CAF50' : '#FF9800'
                      }
                    }} 
                  />
                </Box>

                {/* 统计数据 - 单行显示 */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-around' }}>
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                      {Math.round((currentRestaurant.completed_tasks / currentRestaurant.total_tasks) * 100)}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      完成率
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4CAF50' }}>
                      {currentRestaurant.on_time_rate.toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      准时率
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                      {currentRestaurant.employee_stats.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      在岗员工
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* 最近动态 */}
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                  最近动态
                </Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {currentRestaurant.recent_records.length > 0 ? (
                    currentRestaurant.recent_records.map(record => (
                      <RecordItem key={record.id} record={record} />
                    ))
                  ) : (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      暂无动态记录
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </MotionCard>

            {/* 右侧：员工绩效 */}
            <MotionCard
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                  今日员工绩效
                </Typography>

                {currentRestaurant.employee_stats.map((employee, index) => (
                  <Box 
                    key={employee.user_id}
                    sx={{ 
                      py: 2, 
                      borderBottom: index < currentRestaurant.employee_stats.length - 1 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        sx={{ 
                          width: 36, 
                          height: 36,
                          bgcolor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#e0e0e0',
                          fontWeight: 'bold'
                        }}
                      >
                        {index + 1}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {employee.user_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {employee.role_name}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                        {employee.completed_tasks}/{employee.total_tasks}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {employee.on_time_rate.toFixed(0)}% 准时
                      </Typography>
                    </Box>
                  </Box>
                ))}

                {currentRestaurant.employee_stats.length === 0 && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    暂无员工数据
                  </Typography>
                )}
              </CardContent>
            </MotionCard>
          </Box>
        </Container>
      )}

      {/* 任务预览气泡 */}
      <Popper
        open={Boolean(taskPopperAnchor)}
        anchorEl={taskPopperAnchor}
        placement="top"
        transition
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <ClickAwayListener onClickAway={() => setTaskPopperAnchor(null)}>
              <Paper 
                sx={{ 
                  p: 2, 
                  maxWidth: 300,
                  cursor: 'pointer',
                  boxShadow: 3
                }}
                onClick={handlePopperClick}
              >
                {selectedTask && (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {selectedTask.task_title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                      {selectedTask.user_name} · {format(new Date(selectedTask.created_at), 'HH:mm')}
                    </Typography>
                    {selectedTask.submission_type === 'text' && selectedTask.text_content && (
                      <Typography variant="body2" sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {selectedTask.text_content}
                      </Typography>
                    )}
                    {selectedTask.submission_type === 'photo' && (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        📷 包含{selectedTask.photo_urls?.length || 0}张图片
                      </Typography>
                    )}
                    {selectedTask.submission_type === 'list' && (
                      <Typography variant="body2" sx={{ color: selectedTask.has_errors ? '#f44336' : '#4CAF50' }}>
                        ✅ 检查清单 {selectedTask.has_errors && '(有错误项)'}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: 'primary.main', display: 'block', mt: 1 }}>
                      点击查看详情 →
                    </Typography>
                  </>
                )}
              </Paper>
            </ClickAwayListener>
          </Fade>
        )}
      </Popper>

      {/* 任务详情对话框 */}
      <AnimatePresence>
        {showDetailDialog && <TaskDetailDialog />}
      </AnimatePresence>
    </Box>
  );
};