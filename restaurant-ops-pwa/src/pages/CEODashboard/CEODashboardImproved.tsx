// CEO Dashboard - 改进版：添加时段分组和移动端优化
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
  Tooltip,
  useTheme,
  useMediaQuery,
  Collapse,
  Badge,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
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
  NavigateNext as NavigateNextIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  WbSunny as MorningIcon,
  LunchDining as LunchIcon,
  DinnerDining as DinnerIcon,
  NightsStay as NightIcon,
  AccessTime as TimeIcon,
  CheckBox as CheckBoxIcon,
  CameraAlt as CameraIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 动画组件
const MotionCard = motion(Card);
const MotionBox = motion(Box);

// 时段定义
const TIME_PERIODS = [
  { 
    id: 'morning', 
    name: '开店准备', 
    icon: <MorningIcon />, 
    timeRange: '10:00-11:00',
    color: '#FFC107'
  },
  { 
    id: 'lunch', 
    name: '午餐服务', 
    icon: <LunchIcon />, 
    timeRange: '11:00-14:00',
    color: '#4CAF50'
  },
  { 
    id: 'dinner', 
    name: '晚餐服务', 
    icon: <DinnerIcon />, 
    timeRange: '17:00-21:00',
    color: '#2196F3'
  },
  { 
    id: 'closing', 
    name: '收市清理', 
    icon: <NightIcon />, 
    timeRange: '21:00-22:00',
    color: '#9C27B0'
  }
];

// 任务类型图标映射 - 更新为更直观的图标
const taskTypeIcons: Record<string, React.ReactElement> = {
  text: <DescriptionIcon fontSize="small" />,
  photo: <CameraIcon fontSize="small" />,
  list: <CheckBoxIcon fontSize="small" />,
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
  time_period?: string;
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
  tasks_by_period: Record<string, TaskDetail[]>;
  missing_tasks_count: number; // 新增：缺失任务数量
  late_tasks_count: number; // 新增：延迟任务数量
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
  count?: number; // 添加数量
}

export const CEODashboardImproved: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({
    morning: false,
    lunch: true, // 默认展开当前时段
    dinner: false,
    closing: false
  });
  
  // 任务交互状态
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [taskPopperAnchor, setTaskPopperAnchor] = useState<null | HTMLElement>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 获取当前时间段
  const getCurrentPeriod = () => {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 10 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 14) return 'lunch';
    if (hour >= 17 && hour < 21) return 'dinner';
    if (hour >= 21 && hour < 22) return 'closing';
    return 'lunch'; // 默认
  };

  // 判断任务属于哪个时段
  const getTaskPeriod = (task: TaskDetail): string => {
    if (!task.scheduled_time) return 'morning';
    
    const hour = new Date(task.scheduled_time).getHours();
    if (hour >= 10 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 14) return 'lunch';
    if (hour >= 17 && hour < 21) return 'dinner';
    if (hour >= 21 && hour < 22) return 'closing';
    return 'morning';
  };

  // 获取餐厅任务数据
  const fetchRestaurantData = async () => {
    try {
      // 模拟数据，实际应从数据库获取
      const mockTaskDetails: TaskDetail[] = [
        // 开店准备任务
        { id: '1', task_id: '1', task_title: '厨房设备检查', user_name: '张明', role_name: '后厨主管', submission_type: 'list', created_at: new Date().toISOString(), is_late: false, scheduled_time: new Date().setHours(10, 0), time_period: 'morning' },
        { id: '2', task_id: '2', task_title: '食材验收', user_name: '李红', role_name: '后厨主管', submission_type: 'photo', created_at: new Date().toISOString(), is_late: false, scheduled_time: new Date().setHours(10, 15), time_period: 'morning' },
        { id: '3', task_id: '3', task_title: '开市前员工会议', user_name: '王经理', role_name: '前厅经理', submission_type: 'text', created_at: new Date().toISOString(), is_late: true, scheduled_time: new Date().setHours(10, 30), time_period: 'morning' },
        { id: '4', task_id: '4', task_title: '清洁检查', user_name: '', role_name: '', submission_type: 'list', created_at: '', is_late: false, scheduled_time: new Date().setHours(10, 45), time_period: 'morning' },
        
        // 午餐服务任务
        { id: '5', task_id: '5', task_title: '午餐备餐检查', user_name: '赵师傅', role_name: '主厨', submission_type: 'photo', created_at: new Date().toISOString(), is_late: false, scheduled_time: new Date().setHours(11, 0), time_period: 'lunch' },
        { id: '6', task_id: '6', task_title: '服务质量巡检', user_name: '刘经理', role_name: '值班经理', submission_type: 'list', created_at: new Date().toISOString(), is_late: false, has_errors: true, scheduled_time: new Date().setHours(12, 0), time_period: 'lunch' },
        { id: '7', task_id: '7', task_title: '午餐营业数据', user_name: '王经理', role_name: '前厅经理', submission_type: 'text', created_at: new Date().toISOString(), is_late: false, scheduled_time: new Date().setHours(14, 0), time_period: 'lunch' },
        { id: '8', task_id: '8', task_title: '顾客满意度调查', user_name: '', role_name: '', submission_type: 'text', created_at: '', is_late: false, scheduled_time: new Date().setHours(13, 0), time_period: 'lunch' },
        { id: '9', task_id: '9', task_title: '餐厅卫生检查', user_name: '', role_name: '', submission_type: 'photo', created_at: '', is_late: false, scheduled_time: new Date().setHours(13, 30), time_period: 'lunch' },
        
        // 晚餐服务任务（未完成）
        { id: '10', task_id: '10', task_title: '晚餐备餐', user_name: '', role_name: '', submission_type: 'photo', created_at: '', is_late: false, scheduled_time: new Date().setHours(17, 0), time_period: 'dinner' },
        { id: '11', task_id: '11', task_title: '晚餐巡检', user_name: '', role_name: '', submission_type: 'list', created_at: '', is_late: false, scheduled_time: new Date().setHours(19, 0), time_period: 'dinner' },
        
        // 收市任务（未完成）
        { id: '12', task_id: '12', task_title: '收市清洁', user_name: '', role_name: '', submission_type: 'photo', created_at: '', is_late: false, scheduled_time: new Date().setHours(21, 0), time_period: 'closing' },
        { id: '13', task_id: '13', task_title: '设备关闭清单', user_name: '', role_name: '', submission_type: 'list', created_at: '', is_late: false, scheduled_time: new Date().setHours(21, 30), time_period: 'closing' }
      ];

      // 按时段分组任务
      const tasksByPeriod: Record<string, TaskDetail[]> = {
        morning: [],
        lunch: [],
        dinner: [],
        closing: []
      };

      mockTaskDetails.forEach(task => {
        const period = task.time_period || getTaskPeriod(task);
        if (tasksByPeriod[period]) {
          tasksByPeriod[period].push(task);
        }
      });

      // 计算缺失和延迟任务
      const missingTasks = mockTaskDetails.filter(t => !t.user_name && new Date(t.scheduled_time!) < new Date());
      const lateTasks = mockTaskDetails.filter(t => t.is_late);

      const mockRestaurants: RestaurantData[] = [
        {
          restaurant_id: '1',
          restaurant_name: '野百灵',
          total_tasks: 18,
          completed_tasks: 6,
          on_time_rate: 83.3,
          current_period: TIME_PERIODS.find(p => p.id === getCurrentPeriod())?.name || '午餐服务',
          recent_records: mockTaskDetails.filter(t => t.user_name).slice(0, 5) as TaskRecord[],
          employee_stats: [
            { user_id: '1', user_name: '王经理', role_name: '前厅经理', completed_tasks: 2, total_tasks: 3, on_time_rate: 66.7 },
            { user_id: '2', user_name: '张明', role_name: '后厨主管', completed_tasks: 1, total_tasks: 1, on_time_rate: 100 },
            { user_id: '3', user_name: '李红', role_name: '后厨主管', completed_tasks: 1, total_tasks: 1, on_time_rate: 100 }
          ],
          task_details: mockTaskDetails,
          tasks_by_period: tasksByPeriod,
          missing_tasks_count: missingTasks.length,
          late_tasks_count: lateTasks.length
        },
        {
          restaurant_id: '2',
          restaurant_name: '野百灵二号店',
          total_tasks: 18,
          completed_tasks: 15,
          on_time_rate: 100,
          current_period: TIME_PERIODS.find(p => p.id === getCurrentPeriod())?.name || '午餐服务',
          recent_records: [],
          employee_stats: [],
          task_details: [],
          tasks_by_period: { morning: [], lunch: [], dinner: [], closing: [] },
          missing_tasks_count: 0,
          late_tasks_count: 0
        }
      ];

      setRestaurants(mockRestaurants);
      setSelectedRestaurantId(mockRestaurants[0].restaurant_id);
      setCurrentPeriod(getCurrentPeriod());
      
      // 生成聚合的警告
      const mockAlerts: AlertItem[] = [];
      
      // 缺失任务警告（红色）
      if (missingTasks.length > 0) {
        mockAlerts.push({
          id: '1',
          type: 'error',
          restaurant_id: '1',
          restaurant_name: '野百灵',
          message: `${missingTasks.length}个任务未完成`,
          timestamp: new Date().toISOString(),
          count: missingTasks.length
        });
      }
      
      // 延迟任务警告（黄色）
      if (lateTasks.length > 0) {
        mockAlerts.push({
          id: '2',
          type: 'warning',
          restaurant_id: '1',
          restaurant_name: '野百灵',
          message: `${lateTasks.length}个任务延迟完成`,
          timestamp: new Date().toISOString(),
          count: lateTasks.length
        });
      }
      
      setAlerts(mockAlerts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurantData();
    
    // 设置当前时段默认展开
    const current = getCurrentPeriod();
    setExpandedPeriods(prev => ({
      ...prev,
      [current]: true
    }));
    
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
  const handleTaskClick = (task: TaskDetail) => {
    setSelectedTask(task);
    setShowDetailDialog(true);
  };

  // 切换时段展开/折叠
  const togglePeriodExpansion = (periodId: string) => {
    setExpandedPeriods(prev => ({
      ...prev,
      [periodId]: !prev[periodId]
    }));
  };

  // 任务列表组件 - 按时段分组
  const TaskListByPeriod = () => {
    if (!currentRestaurant) return null;

    return (
      <Box>
        {TIME_PERIODS.map(period => {
          const periodTasks = currentRestaurant.tasks_by_period[period.id] || [];
          const completedCount = periodTasks.filter(t => t.user_name).length;
          const totalCount = periodTasks.length;
          const isCurrentPeriod = period.id === currentPeriod;
          const isExpanded = expandedPeriods[period.id];

          return (
            <Box 
              key={period.id} 
              sx={{ 
                mb: 2,
                border: isCurrentPeriod ? '2px solid' : '1px solid',
                borderColor: isCurrentPeriod ? period.color : '#e0e0e0',
                borderRadius: 2,
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}
            >
              {/* 时段标题栏 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: isCurrentPeriod ? `${period.color}15` : '#f5f5f5',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: isCurrentPeriod ? `${period.color}25` : '#eeeeee'
                  }
                }}
                onClick={() => togglePeriodExpansion(period.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: period.color,
                      color: 'white'
                    }}
                  >
                    {period.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {period.name}
                      {isCurrentPeriod && (
                        <Chip 
                          label="当前" 
                          size="small" 
                          sx={{ 
                            ml: 1, 
                            height: 20,
                            bgcolor: period.color,
                            color: 'white'
                          }} 
                        />
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {period.timeRange} · {completedCount}/{totalCount} 完成
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small">
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>

              {/* 任务列表 */}
              <Collapse in={isExpanded}>
                <Box sx={{ bgcolor: 'background.paper' }}>
                  {/* 进度条 */}
                  <Box sx={{ px: 2, pt: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0}
                      sx={{ 
                        height: 4,
                        borderRadius: 2,
                        bgcolor: '#E0E0E0',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 2,
                          bgcolor: period.color
                        }
                      }}
                    />
                  </Box>
                  
                  {/* 任务列表 */}
                  <List sx={{ py: 0 }}>
                    {periodTasks.map((task, index) => {
                      const isCompleted = !!task.user_name;
                      const isLate = task.is_late;
                      const hasError = task.has_errors;
                      
                      return (
                        <ListItem
                          key={task.id}
                          button
                          onClick={() => handleTaskClick(task)}
                          sx={{
                            borderBottom: index < periodTasks.length - 1 ? '1px solid #f0f0f0' : 'none',
                            bgcolor: hasError ? '#ffebee' : isLate ? '#fff8e1' : 'transparent',
                            '&:hover': {
                              bgcolor: hasError ? '#ffcdd2' : isLate ? '#fff3cd' : '#f5f5f5'
                            }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: isCompleted ? taskTypeColors[task.submission_type] : '#e0e0e0'
                              }}
                            >
                              {taskTypeIcons[task.submission_type]}
                            </Avatar>
                          </ListItemIcon>
                          
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  {task.task_title}
                                </Typography>
                                {isLate && (
                                  <Chip 
                                    label="迟到" 
                                    size="small" 
                                    color="warning"
                                    sx={{ height: 20 }}
                                  />
                                )}
                                {hasError && (
                                  <Chip 
                                    label="异常" 
                                    size="small" 
                                    color="error"
                                    sx={{ height: 20 }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              isCompleted ? (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {task.user_name} ({task.role_name}) · {format(new Date(task.created_at), 'HH:mm')}
                                </Typography>
                              ) : (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  计划时间：{format(new Date(task.scheduled_time!), 'HH:mm')} · 待完成
                                </Typography>
                              )
                            }
                          />
                          
                          <ListItemSecondaryAction>
                            {isCompleted ? (
                              <CheckCircleIcon sx={{ color: hasError ? '#f44336' : '#4CAF50' }} />
                            ) : (
                              <TimeIcon sx={{ color: '#999' }} />
                            )}
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
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
        fullWidth={!isMobile}
        fullScreen={isMobile}
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
                  {selectedTask.user_name ? 
                    `${selectedTask.user_name} (${selectedTask.role_name}) · ${format(new Date(selectedTask.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}` :
                    `计划时间：${format(new Date(selectedTask.scheduled_time!), 'HH:mm')} · 待完成`
                  }
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

          {/* 内容展示区域 */}
          {selectedTask.submission_type === 'text' && selectedTask.text_content && (
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography>{selectedTask.text_content}</Typography>
            </Paper>
          )}

          {selectedTask.submission_type === 'photo' && selectedTask.photo_urls && (
            <ImageList cols={isMobile ? 1 : 2} gap={8}>
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

          {/* 未完成任务提示 */}
          {!selectedTask.user_name && (
            <Alert severity="info" sx={{ mt: 2 }}>
              该任务尚未完成，等待员工提交
            </Alert>
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
        py: isMobile ? 2 : 3,
        px: isMobile ? 2 : 3
      }}>
        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold' }}>
          餐厅运营总览
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          实时数据监控 · {format(new Date(), 'yyyy-MM-dd HH:mm')}
        </Typography>
      </Box>

      {/* 警告区域 - 优先级最高 */}
      {alerts.length > 0 && (
        <Box sx={{ px: isMobile ? 2 : 3, py: 2, bgcolor: 'background.paper', borderBottom: '1px solid #e0e0e0' }}>
          <Stack spacing={1}>
            {alerts.map(alert => (
              <Alert
                key={alert.id}
                severity={alert.type}
                icon={alert.type === 'error' ? <ErrorIcon /> : <WarningIcon />}
                action={
                  <IconButton
                    color="inherit"
                    size="small"
                    onClick={() => handleAlertClick(alert)}
                  >
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                }
                sx={{ 
                  cursor: 'pointer',
                  '& .MuiAlert-icon': {
                    fontSize: 28
                  }
                }}
                onClick={() => handleAlertClick(alert)}
              >
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {alert.restaurant_name} - {alert.message}
                  </Typography>
                  {alert.type === 'error' && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      缺失的任务必须立即完成
                    </Typography>
                  )}
                </Box>
              </Alert>
            ))}
          </Stack>
        </Box>
      )}

      {/* 餐厅切换栏 */}
      <Box sx={{ px: isMobile ? 2 : 3, py: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <ToggleButtonGroup
          value={selectedRestaurantId}
          exclusive
          onChange={handleRestaurantChange}
          aria-label="restaurant selection"
          sx={{ width: '100%', flexWrap: isMobile ? 'wrap' : 'nowrap' }}
        >
          {restaurants.map(restaurant => (
            <ToggleButton 
              key={restaurant.restaurant_id} 
              value={restaurant.restaurant_id}
              sx={{ 
                flex: 1, 
                minWidth: isMobile ? '45%' : 'auto',
                position: 'relative'
              }}
            >
              <RestaurantIcon sx={{ mr: 1 }} />
              {restaurant.restaurant_name}
              {/* 显示警告数量 */}
              {(restaurant.missing_tasks_count > 0 || restaurant.late_tasks_count > 0) && (
                <Box sx={{ ml: 1, display: 'flex', gap: 0.5 }}>
                  {restaurant.missing_tasks_count > 0 && (
                    <Chip 
                      label={restaurant.missing_tasks_count} 
                      size="small" 
                      color="error"
                      sx={{ height: 20, minWidth: 24 }}
                    />
                  )}
                  {restaurant.late_tasks_count > 0 && (
                    <Chip 
                      label={restaurant.late_tasks_count} 
                      size="small" 
                      color="warning"
                      sx={{ height: 20, minWidth: 24 }}
                    />
                  )}
                </Box>
              )}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* 主内容区域 */}
      {currentRestaurant && (
        <Container maxWidth="xl" sx={{ py: isMobile ? 2 : 3 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              md: isTablet ? '1fr' : '1fr 1fr' 
            }, 
            gap: isMobile ? 2 : 3 
          }}>
            {/* 左侧：任务完成情况 */}
            <MotionCard
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    任务完成情况
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Chip 
                      label={`${currentRestaurant.completed_tasks}/${currentRestaurant.total_tasks} 完成`}
                      color="primary" 
                      size="small" 
                    />
                    <Chip 
                      label={`${currentRestaurant.on_time_rate.toFixed(0)}% 准时`}
                      color="success" 
                      size="small" 
                    />
                  </Box>
                </Box>

                {/* 按时段分组的任务列表 */}
                <TaskListByPeriod />
              </CardContent>
            </MotionCard>

            {/* 右侧：员工绩效 */}
            <MotionCard
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
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
                          width: isMobile ? 32 : 36, 
                          height: isMobile ? 32 : 36,
                          bgcolor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#e0e0e0',
                          fontWeight: 'bold',
                          fontSize: isMobile ? 14 : 16
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

      {/* 任务详情对话框 */}
      <AnimatePresence>
        {showDetailDialog && <TaskDetailDialog />}
      </AnimatePresence>
    </Box>
  );
};