// CEO Dashboard - 数据库版本：完全基于真实数据
// 性能优化版本：减少查询，使用React.memo，添加加载骨架
import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
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
  Alert,
  Stack,
  useTheme,
  useMediaQuery,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Backdrop,
  Skeleton
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Restaurant as RestaurantIcon,
  ArrowForward as ArrowForwardIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  WbSunny as MorningIcon,
  LunchDining as LunchIcon,
  DinnerDining as DinnerIcon,
  NightsStay as NightIcon,
  AccessTime as TimeIcon,
  CheckBox as CheckBoxIcon,
  CameraAlt as CameraIcon,
  Description as DescriptionIcon,
  Storefront as StorefrontIcon,
  Kitchen as KitchenIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { ceoDashboardService } from '../../services/ceoDashboardService';
import type { 
  CEORestaurantData, 
  CEOTaskDetail, 
  CEOAlert,
  CEOPeriod,
  CombinedRestaurantData,
  FloatingTaskInfo 
} from '../../services/ceoDashboardService';
import { NavigationBar } from '../../components/Navigation/NavigationBar';

// 动画组件
const MotionCard = motion(Card);

// 时段图标映射 - 基于时段显示名称或ID模式
const getPeriodIcon = (periodId: string, displayName: string): React.ReactElement => {
  // 基于显示名称精确匹配
  if (displayName.includes('开店')) return <MorningIcon />;
  if (displayName.includes('餐前准备') && displayName.includes('午')) return <LunchIcon />;
  if (displayName.includes('午餐服务')) return <LunchIcon />;
  if (displayName.includes('餐后收市') && displayName.includes('午')) return <TimeIcon />; // 使用不同图标
  if (displayName.includes('餐前准备') && displayName.includes('晚')) return <DinnerIcon />;
  if (displayName.includes('晚餐服务')) return <DinnerIcon />;
  if (displayName.includes('闭店') || displayName.includes('收市与打烊')) return <NightIcon />;
  
  return <TimeIcon />;
};

// 时段颜色映射 - 基于时段显示名称或ID模式
const getPeriodColor = (periodId: string, displayName: string): string => {
  // 优先基于ID模式匹配
  if (periodId.includes('opening')) return '#FFC107';
  if (periodId.includes('lunch')) return '#4CAF50';
  if (periodId.includes('dinner')) return '#2196F3';
  if (periodId.includes('closing')) return '#9C27B0';
  
  // 基于显示名称匹配
  if (displayName.includes('开店')) return '#FFC107';
  if (displayName.includes('午') || displayName.includes('午餐')) return '#4CAF50';
  if (displayName.includes('晚') || displayName.includes('晚餐')) return '#2196F3';
  if (displayName.includes('闭店') || displayName.includes('收市')) return '#9C27B0';
  
  return '#757575';
};

// 任务类型图标映射
const TASK_TYPE_ICONS: Record<string, React.ReactElement> = {
  text: <DescriptionIcon fontSize="small" />,
  photo: <CameraIcon fontSize="small" />,
  list: <CheckBoxIcon fontSize="small" />,
  none: <CheckCircleIcon fontSize="small" />
};

// 任务类型颜色映射
const TASK_TYPE_COLORS: Record<string, string> = {
  text: '#2196F3',
  photo: '#4CAF50',
  list: '#FF9800',
  none: '#9E9E9E'
};

export const CEODashboardDB: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [frontOfficeRestaurants, setFrontOfficeRestaurants] = useState<CEORestaurantData[]>([]);
  const [kitchenRestaurants, setKitchenRestaurants] = useState<CEORestaurantData[]>([]);
  const [combinedRestaurantData, setCombinedRestaurantData] = useState<CombinedRestaurantData[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<'前厅' | '后厨'>('前厅');
  const [alerts, setAlerts] = useState<CEOAlert[]>([]);
  const [periods, setPeriods] = useState<CEOPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriodId, setCurrentPeriodId] = useState('');
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});
  const [expandedFloatingTasks, setExpandedFloatingTasks] = useState(false);
  
  // 任务交互状态
  const [selectedTask, setSelectedTask] = useState<CEOTaskDetail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [floatingTaskSubmissions, setFloatingTaskSubmissions] = useState<CEOTaskDetail[]>([]);
  const [showFloatingTaskDialog, setShowFloatingTaskDialog] = useState(false);
  const [selectedFloatingTask, setSelectedFloatingTask] = useState<FloatingTaskInfo | null>(null);
  const [loadingFloatingSubmissions, setLoadingFloatingSubmissions] = useState(false);

  // 更新时段统计
  const updatePeriodStatistics = (restaurant: CEORestaurantData | undefined, basePeriods?: CEOPeriod[]) => {
    if (!restaurant || (!periods.length && !basePeriods)) return;
    
    // 使用传入的 basePeriods 或现有的 periods
    const periodsToUpdate = basePeriods || periods;
    
    const updatedPeriods = periodsToUpdate.map(period => {
      const periodTasks = restaurant.tasks_by_period[period.id] || [];
      const warningCount = periodTasks.filter(t => t.is_late).length;
      const errorCount = periodTasks.filter(t => t.status === 'missing' || t.has_errors).length;
      
      return {
        ...period,
        warning_count: warningCount || undefined,  // 如果是0则设为undefined
        error_count: errorCount || undefined      // 如果是0则设为undefined
      };
    });
    
    setPeriods(updatedPeriods);
  };

  // 加载数据（使用useCallback优化）
  const navigate = useNavigate();

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const data = await ceoDashboardService.getAllRestaurantsData();
      
      setFrontOfficeRestaurants(data.frontOfficeData.restaurants);
      setKitchenRestaurants(data.kitchenData.restaurants);
      setCombinedRestaurantData(data.combinedData);
      setPeriods(data.periods);
      
      // 始终显示所有警告，不根据部门过滤
      setAlerts(data.allAlerts);
      
      // 设置默认选中的餐厅
      const currentRestaurants = selectedDepartment === '前厅' 
        ? data.frontOfficeData.restaurants 
        : data.kitchenData.restaurants;
        
      if (!selectedRestaurantId && currentRestaurants.length > 0) {
        // 优先选择有警告的餐厅
        const restaurantWithAlert = currentRestaurants.find(r => 
          data.allAlerts.some(a => a.restaurant_id === r.restaurant_id)
        );
        setSelectedRestaurantId(
          restaurantWithAlert?.restaurant_id || currentRestaurants[0].restaurant_id
        );
      }
      
      // 设置当前时段并默认展开
      const currentRestaurant = currentRestaurants.find(r => 
        r.restaurant_id === (selectedRestaurantId || currentRestaurants[0]?.restaurant_id)
      );
      
      if (currentRestaurant?.current_period_id) {
        setCurrentPeriodId(currentRestaurant.current_period_id);
        setExpandedPeriods(prev => ({
          ...prev,
          [currentRestaurant.current_period_id]: true
        }));
      }
      
      // 更新时段统计 - 传入基础 periods 数据
      updatePeriodStatistics(currentRestaurant, data.periods);
      
      if (showLoading) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading CEO dashboard data:', error);
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [selectedRestaurantId, selectedDepartment]);

  useEffect(() => {
    loadData(true); // 初始加载显示loading
    
    // 设置定时刷新（不显示loading，避免闪烁）
    const interval = setInterval(() => {
      loadData(false);
    }, 60000); // 每分钟刷新

    // 订阅实时更新（不显示loading）
    const unsubscribe = ceoDashboardService.subscribeToUpdates(() => {
      loadData(false);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadData]); // 依赖loadData函数

  // 获取当前显示的餐厅列表（根据部门）
  const restaurants = selectedDepartment === '前厅' ? frontOfficeRestaurants : kitchenRestaurants;
  
  // 获取当前选中的餐厅数据
  const currentRestaurant = restaurants.find(r => r.restaurant_id === selectedRestaurantId);

  // 处理餐厅切换
  const handleRestaurantChange = (event: React.MouseEvent<HTMLElement>, newRestaurantId: string | null) => {
    if (newRestaurantId) {
      setSelectedRestaurantId(newRestaurantId);
      
      // 更新当前时段
      const restaurant = restaurants.find(r => r.restaurant_id === newRestaurantId);
      if (restaurant?.current_period_id) {
        setCurrentPeriodId(restaurant.current_period_id);
        setExpandedPeriods(prev => ({
          ...prev,
          [restaurant.current_period_id]: true
        }));
      }
      
      // 更新时段统计 - 不传入 basePeriods，使用现有的
      if (restaurant && periods.length > 0) {
        updatePeriodStatistics(restaurant);
      }
    }
  };

  // 处理警告点击
  const handleAlertClick = (alert: CEOAlert) => {
    setSelectedRestaurantId(alert.restaurant_id);
  };

  // 处理任务点击
  const handleTaskClick = (task: CEOTaskDetail) => {
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

  // 退出到角色选择
  const handleLogout = () => {
    navigate('/role-selection');
  };

  // 处理部门切换
  const handleDepartmentChange = (department: '前厅' | '后厨') => {
    setSelectedDepartment(department);
    
    // 更新时段统计（基于新部门的数据）
    const currentRestaurants = department === '前厅' ? frontOfficeRestaurants : kitchenRestaurants;
    const restaurant = currentRestaurants.find(r => r.restaurant_id === selectedRestaurantId);
    if (restaurant && periods.length > 0) {
      updatePeriodStatistics(restaurant);
    }
  };

  // 任务列表组件 - 按时段分组（使用memo优化）
  const TaskListByPeriod = memo(() => {
    if (!currentRestaurant) return null;

    return (
      <Box>
        {/* 先显示时段任务 */}
        {periods.map(period => {
          const periodTasks = currentRestaurant.tasks_by_period[period.id] || [];
          
          // 跳过没有任务的时段
          if (periodTasks.length === 0) return null;
          
          const completedCount = periodTasks.filter(t => t.status === 'completed').length;
          const totalCount = periodTasks.length;
          const isCurrentPeriod = period.id === currentPeriodId;
          const isExpanded = expandedPeriods[period.id];
          
          const periodIcon = getPeriodIcon(period.id, period.display_name);
          const periodColor = getPeriodColor(period.id, period.display_name);

          return (
            <Box 
              key={period.id} 
              sx={{ 
                mb: 2,
                border: isCurrentPeriod ? '2px solid' : '1px solid',
                borderColor: isCurrentPeriod ? periodColor : '#e0e0e0',
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
                  bgcolor: isCurrentPeriod ? `${periodColor}15` : '#f5f5f5',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: isCurrentPeriod ? `${periodColor}25` : '#eeeeee'
                  }
                }}
                onClick={() => togglePeriodExpansion(period.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: periodColor,
                      color: 'white'
                    }}
                  >
                    {periodIcon}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {period.display_name}
                      {isCurrentPeriod && (
                        <Chip 
                          label="当前" 
                          size="small" 
                          sx={{ 
                            ml: 1, 
                            height: 20,
                            bgcolor: periodColor,
                            color: 'white'
                          }} 
                        />
                      )}
                      {/* 显示警告和错误数量 - 只在大于0时显示，不显示图标 */}
                      {period.error_count > 0 && (
                        <Chip 
                          label={period.error_count} 
                          size="small" 
                          color="error"
                          sx={{ ml: 0.5, height: 20, minWidth: 24 }}
                        />
                      )}
                      {period.warning_count > 0 && (
                        <Chip 
                          label={period.warning_count} 
                          size="small" 
                          color="warning"
                          sx={{ ml: 0.5, height: 20, minWidth: 24 }}
                        />
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {period.start_time.substring(0, 5)}-{period.end_time.substring(0, 5)} · {completedCount}/{totalCount} 完成
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
                  {totalCount > 0 && (
                    <Box sx={{ px: 2, pt: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={(completedCount / totalCount) * 100}
                        sx={{ 
                          height: 4,
                          borderRadius: 2,
                          bgcolor: '#E0E0E0',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                            bgcolor: periodColor
                          }
                        }}
                      />
                    </Box>
                  )}
                  
                  {/* 任务列表 */}
                  <List sx={{ py: 0 }}>
                    {periodTasks.length === 0 ? (
                      <ListItem>
                        <ListItemText 
                          primary={
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                              该时段暂无任务
                            </Typography>
                          }
                        />
                      </ListItem>
                    ) : (
                      periodTasks.map((task, index) => {
                        const isCompleted = task.status === 'completed';
                        const isMissing = task.status === 'missing';
                        const isLate = task.is_late;
                        const hasError = task.has_errors;
                        
                        return (
                          <ListItem
                            key={task.id}
                            component="div"
                            onClick={() => handleTaskClick(task)}
                            sx={{
                              cursor: 'pointer',
                              borderBottom: index < periodTasks.length - 1 ? '1px solid #f0f0f0' : 'none',
                              bgcolor: isMissing ? '#ffebee' : hasError ? '#fff3e0' : isLate ? '#fff8e1' : 'transparent',
                              '&:hover': {
                                bgcolor: isMissing ? '#ffcdd2' : hasError ? '#ffe0b2' : isLate ? '#fff3cd' : '#f5f5f5'
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: isCompleted ? TASK_TYPE_COLORS[task.submission_type] : '#e0e0e0'
                                }}
                              >
                                {TASK_TYPE_ICONS[task.submission_type]}
                              </Avatar>
                            </ListItemIcon>
                            
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2">
                                    {task.task_title}
                                  </Typography>
                                  {isMissing && (
                                    <Chip 
                                      label="缺失" 
                                      size="small" 
                                      color="error"
                                      sx={{ height: 20 }}
                                    />
                                  )}
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
                                      color="warning"
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
                                    {task.scheduled_time ? 
                                      `计划时间：${format(new Date(task.scheduled_time), 'HH:mm')}` : 
                                      '待完成'
                                    }
                                    {isMissing && ' · 应立即完成'}
                                  </Typography>
                                )
                              }
                            />
                            
                            <ListItemSecondaryAction>
                              {isCompleted ? (
                                <CheckCircleIcon sx={{ color: hasError ? '#f44336' : '#4CAF50' }} />
                              ) : isMissing ? (
                                <ErrorIcon sx={{ color: '#f44336' }} />
                              ) : (
                                <TimeIcon sx={{ color: '#999' }} />
                              )}
                            </ListItemSecondaryAction>
                          </ListItem>
                        );
                      })
                    )}
                  </List>
                </Box>
              </Collapse>
            </Box>
          );
        })}
        
        {/* 显示浮动任务提交统计（如果有） */}
        {currentRestaurant.floating_task_info && currentRestaurant.floating_task_info.length > 0 && (
          <Box 
            sx={{ 
              mb: 2,
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            {/* 浮动任务标题栏 - 可点击折叠 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                bgcolor: '#f5f5f5',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: '#eeeeee'
                }
              }}
              onClick={() => setExpandedFloatingTasks(!expandedFloatingTasks)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: '#9E9E9E',
                    color: 'white'
                  }}
                >
                  <TimeIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    浮动任务
                    {currentRestaurant.floating_task_info.length > 0 && (
                      <Chip 
                        label={`${currentRestaurant.floating_task_info.reduce((sum, task) => sum + task.submission_count, 0)} 次提交`} 
                        size="small" 
                        sx={{ 
                          ml: 1, 
                          height: 20,
                          bgcolor: '#9E9E9E',
                          color: 'white'
                        }} 
                      />
                    )}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    可随时完成的任务 · {currentRestaurant.floating_task_info.length} 个任务
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small">
                {expandedFloatingTasks ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            {/* 浮动任务统计列表 - 可折叠 */}
            <Collapse in={expandedFloatingTasks}>
              <Box sx={{ bgcolor: 'background.paper' }}>
                <List sx={{ py: 0 }}>
                {currentRestaurant.floating_task_info.map((taskInfo, index) => (
                  <ListItem
                    key={taskInfo.task_id}
                    component="div"
                    onClick={async () => {
                      // 显示该浮动任务的所有提交记录
                      setSelectedFloatingTask(taskInfo);
                      setLoadingFloatingSubmissions(true);
                      setShowFloatingTaskDialog(true);
                      
                      const submissions = await ceoDashboardService.getFloatingTaskSubmissions(
                        taskInfo.task_id,
                        selectedRestaurantId,
                        selectedDepartment
                      );
                      
                      setFloatingTaskSubmissions(submissions);
                      setLoadingFloatingSubmissions(false);
                    }}
                    sx={{
                      cursor: 'pointer',
                      borderBottom: index < currentRestaurant.floating_task_info.length - 1 ? '1px solid #f0f0f0' : 'none',
                      '&:hover': {
                        bgcolor: '#f5f5f5'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor: taskInfo.submission_count > 0 ? TASK_TYPE_COLORS[taskInfo.submission_type] : '#e0e0e0'
                        }}
                      >
                        {TASK_TYPE_ICONS[taskInfo.submission_type]}
                      </Avatar>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={taskInfo.task_title}
                      secondary={
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          今日已提交 {taskInfo.submission_count} 次
                        </Typography>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Chip 
                        label={taskInfo.submission_count} 
                        size="small" 
                        color={taskInfo.submission_count > 0 ? "success" : "default"}
                        sx={{ minWidth: 32 }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                </List>
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>
    );
  });

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
              <Avatar sx={{ bgcolor: TASK_TYPE_COLORS[selectedTask.submission_type] }}>
                {TASK_TYPE_ICONS[selectedTask.submission_type]}
              </Avatar>
              <Box>
                <Typography variant="h6">{selectedTask.task_title}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {selectedTask.status === 'completed' ? 
                    `${selectedTask.user_name} (${selectedTask.role_name}) · ${format(new Date(selectedTask.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}` :
                    `${selectedTask.period_name} · ${selectedTask.status === 'missing' ? '缺失任务' : '待完成'}`
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

          {/* 迟交原因 - 显示在时间信息下方 */}
          {selectedTask.is_late && selectedTask.makeup_reason && (
            <Box sx={{ mb: 2, p: 2, bgcolor: '#fff8e1', borderRadius: 1, border: '1px solid #ffb74d' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#ff6f00' }}>
                迟交原因 (Makeup Reason):
              </Typography>
              <Typography variant="body2">
                {selectedTask.makeup_reason}
              </Typography>
            </Box>
          )}

          {/* 内容展示区域 */}
          {selectedTask.submission_type === 'text' && selectedTask.text_content && (
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography>{selectedTask.text_content}</Typography>
            </Paper>
          )}

          {selectedTask.submission_type === 'photo' && (
            <>
              {/* 如果有photoGroups metadata，按组显示 */}
              {selectedTask.submission_metadata?.photoGroups ? (
                <Box>
                  {selectedTask.submission_metadata.photoGroups.map((group: any, groupIndex: number) => (
                    <Box key={group.id || groupIndex} sx={{ mb: 3 }}>
                      {/* 组标题和参考信息 */}
                      <Box sx={{ mb: 1, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          组 {groupIndex + 1} {group.sampleRef && `- ${group.sampleRef}`}
                        </Typography>
                        {group.comment && (
                          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                            备注：{group.comment}
                          </Typography>
                        )}
                      </Box>
                      
                      {/* 该组的照片 */}
                      <ImageList cols={isMobile ? 1 : 2} gap={8}>
                        {group.photos.map((url: string, photoIndex: number) => (
                          <ImageListItem key={photoIndex}>
                            <img
                              src={url}
                              alt={`组${groupIndex + 1} 图片${photoIndex + 1}`}
                              loading="lazy"
                              style={{ borderRadius: 8, maxHeight: 300, objectFit: 'cover' }}
                            />
                          </ImageListItem>
                        ))}
                      </ImageList>
                    </Box>
                  ))}
                </Box>
              ) : (
                /* 兼容旧格式，直接显示photo_urls */
                selectedTask.photo_urls && selectedTask.photo_urls.length > 0 && (
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
                )
              )}
            </>
          )}

          {/* List类型任务 - 兼容checklist和items两种格式 */}
          {selectedTask.submission_type === 'list' && (selectedTask.submission_metadata?.checklist || selectedTask.submission_metadata?.items) && (
            <Box>
              {/* 统计信息 */}
              {(() => {
                // 兼容两种数据格式：checklist 和 items
                const listItems = selectedTask.submission_metadata.checklist || selectedTask.submission_metadata.items || [];
                const passCount = listItems.filter((item: any) => 
                  item.status === 'pass' || item.status === 'checked'
                ).length;
                const totalCount = listItems.length;
                const hasErrors = passCount < totalCount;
                return (
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      完成进度：{passCount}/{totalCount}
                    </Typography>
                    {hasErrors && (
                      <Chip 
                        label="有未完成项" 
                        size="small" 
                        color="error" 
                        icon={<WarningIcon />}
                      />
                    )}
                  </Box>
                );
              })()}

              {/* 检查项列表 */}
              {(selectedTask.submission_metadata.checklist || selectedTask.submission_metadata.items || []).map((item: any, index: number) => {
                // 兼容不同的状态格式
                const isCompleted = item.status === 'pass' || item.status === 'checked';
                // 获取显示文本（兼容 title 和 text 字段）
                const displayText = item.title || item.text || '未知项';
                
                return (
                  <Box
                    key={index}
                    sx={{
                      p: 1.5,
                      mb: 1,
                      bgcolor: isCompleted ? '#e8f5e9' : '#ffebee',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      border: !isCompleted ? '1px solid #f44336' : 'none'
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon sx={{ color: '#4CAF50' }} />
                    ) : (
                      <WarningIcon sx={{ color: '#f44336' }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: !isCompleted ? 600 : 400 }}>
                        {displayText}
                      </Typography>
                      {item.note && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          备注：{item.note}
                        </Typography>
                      )}
                    </Box>
                    {!isCompleted && (
                      <Chip label="未完成" size="small" color="error" />
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {/* 未完成任务提示 */}
          {selectedTask.status !== 'completed' && (
            <Alert 
              severity={selectedTask.status === 'missing' ? 'error' : 'info'} 
              sx={{ mt: 2 }}
            >
              {selectedTask.status === 'missing' ? 
                '该任务已超过计划时间，需要立即完成' : 
                '该任务尚未完成，等待员工提交'
              }
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // 加载骨架屏 - 提供更好的视觉反馈
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
        {/* Header骨架 */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          py: 2,
          px: 2,
          height: 64
        }}>
          <Skeleton variant="text" width={200} height={30} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
        </Box>
        
        {/* 餐厅切换栏骨架 */}
        <Box sx={{ px: 3, py: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant="rectangular" width={150} height={40} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        </Box>
        
        {/* 内容区域骨架 */}
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {/* 左侧任务列表骨架 */}
            <Card>
              <CardContent>
                <Skeleton variant="text" width={150} height={30} sx={{ mb: 2 }} />
                {[1, 2, 3].map(i => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                  </Box>
                ))}
              </CardContent>
            </Card>
            
            {/* 右侧员工统计骨架 */}
            <Card>
              <CardContent>
                <Skeleton variant="text" width={150} height={30} sx={{ mb: 2 }} />
                {[1, 2, 3, 4].map(i => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="40%" />
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>

      {/* 简化的Header - 与Manager面板保持一致 */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        color: 'white',
        py: 2,
        px: 2,
        display: 'flex',
        alignItems: 'center'
      }}>
        <IconButton 
          color="inherit" 
          onClick={handleLogout}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          餐厅运营总览
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {format(new Date(), 'HH:mm:ss')}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {format(new Date(), 'MM月dd日')}
          </Typography>
        </Box>
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
                    {alert.restaurant_name}-{alert.department} - {alert.message}
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
          {combinedRestaurantData.map(restaurant => (
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
              {/* 显示合并后的警告数量 */}
              {(restaurant.total_missing_tasks > 0 || restaurant.total_late_tasks > 0 || restaurant.total_error_tasks > 0) && (
                <Box sx={{ ml: 1, display: 'flex', gap: 0.5 }}>
                  {restaurant.total_missing_tasks > 0 && (
                    <Chip 
                      label={restaurant.total_missing_tasks} 
                      size="small" 
                      color="error"
                      sx={{ height: 20, minWidth: 24 }}
                    />
                  )}
                  {restaurant.total_late_tasks > 0 && (
                    <Chip 
                      label={restaurant.total_late_tasks} 
                      size="small" 
                      color="warning"
                      sx={{ height: 20, minWidth: 24 }}
                    />
                  )}
                  {restaurant.total_error_tasks > 0 && (
                    <Chip 
                      label={restaurant.total_error_tasks} 
                      size="small" 
                      sx={{ 
                        height: 20, 
                        minWidth: 24,
                        bgcolor: '#ff9800',
                        color: 'white'
                      }}
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    任务完成情况
                  </Typography>
                  
                  {/* 部门切换 - 简化的设计 */}
                  <ToggleButtonGroup
                    value={selectedDepartment}
                    exclusive
                    onChange={(e, value) => value && handleDepartmentChange(value)}
                    size="small"
                    sx={{ height: 32 }}
                  >
                    <ToggleButton value="前厅" sx={{ px: 2, fontSize: '0.875rem' }}>
                      前厅
                    </ToggleButton>
                    <ToggleButton value="后厨" sx={{ px: 2, fontSize: '0.875rem' }}>
                      后厨
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
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
                  {currentRestaurant.is_manually_closed && (
                    <Chip 
                      label="已手动闭店"
                      color="error"
                      size="small"
                      icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                      sx={{ fontWeight: 'bold' }}
                    />
                  )}
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

                {currentRestaurant.employee_stats.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    暂无员工数据
                  </Typography>
                ) : (
                  currentRestaurant.employee_stats.map((employee, index) => (
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
                  ))
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

      {/* 浮动任务提交记录对话框 */}
      <Dialog
        open={showFloatingTaskDialog}
        onClose={() => {
          setShowFloatingTaskDialog(false);
          setFloatingTaskSubmissions([]);
          setSelectedFloatingTask(null);
        }}
        maxWidth="md"
        fullWidth={!isMobile}
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            height: isMobile ? '100%' : '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        {/* 固定的标题栏 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          p: 2,
          borderBottom: '1px solid #e0e0e0'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: selectedFloatingTask ? TASK_TYPE_COLORS[selectedFloatingTask.submission_type] : '#9E9E9E' }}>
              {selectedFloatingTask ? TASK_TYPE_ICONS[selectedFloatingTask.submission_type] : <TimeIcon />}
            </Avatar>
            <Box>
              <Typography variant="h6">{selectedFloatingTask?.task_title}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                浮动任务 · 今日提交 {selectedFloatingTask?.submission_count || 0} 次
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => {
            setShowFloatingTaskDialog(false);
            setFloatingTaskSubmissions([]);
            setSelectedFloatingTask(null);
          }}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* 可滚动的内容区域 */}
        <DialogContent sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* 加载状态 */}
          {loadingFloatingSubmissions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : floatingTaskSubmissions.length === 0 ? (
            <Alert severity="info">
              暂无提交记录
            </Alert>
          ) : (
            /* 提交记录列表 */
            <Box>
              {floatingTaskSubmissions.map((submission, index) => (
                <Box 
                  key={submission.id} 
                  sx={{ 
                    mb: 3, 
                    pb: 3, 
                    borderBottom: index < floatingTaskSubmissions.length - 1 ? '1px solid #e0e0e0' : 'none' 
                  }}
                >
                  {/* 提交信息头部 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        第 {floatingTaskSubmissions.length - index} 次提交
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {submission.user_name} ({submission.role_name}) · {format(new Date(submission.created_at), 'HH:mm:ss', { locale: zhCN })}
                      </Typography>
                    </Box>
                    {submission.is_late && (
                      <Chip label="延迟" size="small" color="warning" />
                    )}
                  </Box>

                  {/* 根据提交类型显示内容 */}
                  {submission.submission_type === 'text' && submission.text_content && (
                    <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                      <Typography>{submission.text_content}</Typography>
                    </Paper>
                  )}

                  {submission.submission_type === 'photo' && (
                    <>
                      {/* 如果有photoGroups metadata，按组显示 */}
                      {submission.submission_metadata?.photoGroups ? (
                        <Box>
                          {submission.submission_metadata.photoGroups.map((group: any, groupIndex: number) => (
                            <Box key={group.id || groupIndex} sx={{ mb: 2 }}>
                              {/* 组标题和参考信息 */}
                              {(group.sampleRef || group.comment) && (
                                <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                  {group.sampleRef && (
                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                      {group.sampleRef}
                                    </Typography>
                                  )}
                                  {group.comment && (
                                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                      备注：{group.comment}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                              
                              {/* 该组的照片 */}
                              <ImageList cols={isMobile ? 1 : 3} gap={8}>
                                {group.photos.map((url: string, photoIndex: number) => (
                                  <ImageListItem key={photoIndex}>
                                    <img
                                      src={url}
                                      alt={`图片${photoIndex + 1}`}
                                      loading="lazy"
                                      style={{ borderRadius: 8, maxHeight: 200, objectFit: 'cover' }}
                                    />
                                  </ImageListItem>
                                ))}
                              </ImageList>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        /* 兼容旧格式，直接显示photo_urls */
                        submission.photo_urls && submission.photo_urls.length > 0 && (
                          <ImageList cols={isMobile ? 1 : 3} gap={8}>
                            {submission.photo_urls.map((url, photoIndex) => (
                              <ImageListItem key={photoIndex}>
                                <img
                                  src={url}
                                  alt={`图片 ${photoIndex + 1}`}
                                  loading="lazy"
                                  style={{ borderRadius: 8, maxHeight: 200, objectFit: 'cover' }}
                                />
                              </ImageListItem>
                            ))}
                          </ImageList>
                        )
                      )}
                    </>
                  )}

                  {/* List类型任务 */}
                  {submission.submission_type === 'list' && (submission.submission_metadata?.checklist || submission.submission_metadata?.items) && (
                    <Box>
                      {(submission.submission_metadata.checklist || submission.submission_metadata.items || []).map((item: any, itemIndex: number) => {
                        const isCompleted = item.status === 'pass' || item.status === 'checked';
                        const displayText = item.title || item.text || '未知项';
                        
                        return (
                          <Box
                            key={itemIndex}
                            sx={{
                              p: 1,
                              mb: 0.5,
                              bgcolor: isCompleted ? '#e8f5e9' : '#ffebee',
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            {isCompleted ? (
                              <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
                            ) : (
                              <WarningIcon sx={{ color: '#f44336', fontSize: 20 }} />
                            )}
                            <Typography variant="body2">
                              {displayText}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        
        {/* 底部操作栏 - 只在非移动端显示 */}
        {!isMobile && (
          <DialogActions sx={{ borderTop: '1px solid #e0e0e0', px: 2, py: 1 }}>
            <Button onClick={() => {
              setShowFloatingTaskDialog(false);
              setFloatingTaskSubmissions([]);
              setSelectedFloatingTask(null);
            }}>关闭</Button>
          </DialogActions>
        )}
      </Dialog>
      
      {/* 底部导航栏 - 为CEO添加 */}
      <NavigationBar role="ceo" />
      
      {/* 为底部导航栏留出空间 */}
      <Box sx={{ pb: 8 }} />
    </Box>
  );
};