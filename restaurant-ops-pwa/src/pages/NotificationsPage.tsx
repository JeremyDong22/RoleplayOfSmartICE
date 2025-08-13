// Notifications page for displaying user notifications
// Created: 2025-08-11 - Initial implementation for manager/chef/duty-manager notifications

import React from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  IconButton,
  Divider,
  Badge,
  Chip
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  CheckCircle,
  Warning,
  Info,
  Delete,
  ArrowBack
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { NavigationBar } from '../components/Navigation/NavigationBar'

interface NotificationsPageProps {
  role?: 'manager' | 'chef' | 'duty-manager' | 'ceo'
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ role = 'manager' }) => {
  const navigate = useNavigate()
  
  // Mock notifications data - replace with actual data from database
  const notifications = [
    {
      id: 1,
      type: 'info',
      title: '新任务分配',
      message: '您有新的任务需要完成',
      time: '5分钟前',
      read: false
    },
    {
      id: 2,
      type: 'success',
      title: '任务已完成',
      message: '开店准备任务已成功完成',
      time: '30分钟前',
      read: true
    },
    {
      id: 3,
      type: 'warning',
      title: '任务即将到期',
      message: '午餐服务任务将在10分钟后到期',
      time: '1小时前',
      read: false
    }
  ]
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle color="success" />
      case 'warning':
        return <Warning color="warning" />
      case 'info':
      default:
        return <Info color="info" />
    }
  }
  
  const handleBack = () => {
    const roleRoutes = {
      'manager': '/manager',
      'chef': '/chef',
      'duty-manager': '/duty-manager'
    }
    navigate(roleRoutes[role])
  }
  
  const unreadCount = notifications.filter(n => !n.read).length
  
  return (
    <Box sx={{ pb: 10, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} size="small">
            <ArrowBack />
          </IconButton>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
            <Typography variant="h6">通知中心</Typography>
          </Box>
          {unreadCount > 0 && (
            <Chip 
              label={`${unreadCount} 条未读`} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          )}
        </Box>
      </Paper>
      
      {/* Notifications List */}
      <Paper sx={{ mx: 2 }}>
        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">
              暂无通知
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  secondaryAction={
                    <IconButton edge="end" size="small">
                      <Delete />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'transparent' }}>
                      {getIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={notification.read ? 400 : 600}>
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'primary.main'
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span">
                        <Typography component="span" variant="body2" color="text.secondary" display="block">
                          {notification.message}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.disabled">
                          {notification.time}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      
      {/* Navigation Bar */}
      <NavigationBar role={role} />
    </Box>
  )
}