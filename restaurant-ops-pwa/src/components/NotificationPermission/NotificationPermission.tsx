/**
 * 通知权限请求组件
 * 用于在应用启动时请求推送通知权限
 * @created by Claude
 * @date 2025-01-24
 */

import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import notificationService from '../../services/notificationService';

const NotificationPermission: React.FC = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // 检查通知权限状态
    const checkPermission = () => {
      if (notificationService.isSupported()) {
        const currentPermission = notificationService.getPermission();
        setPermission(currentPermission);
        
        // 如果权限是默认状态，显示请求对话框
        if (currentPermission === 'default') {
          // 延迟显示，避免应用刚加载就弹出
          setTimeout(() => {
            setShowDialog(true);
          }, 2000);
        }
      }
    };

    checkPermission();
  }, []);

  const handleRequestPermission = async () => {
    const result = await notificationService.requestPermission();
    setPermission(result);
    setShowDialog(false);
    
    // 如果授权成功，发送测试通知
    if (result === 'granted') {
      setTimeout(() => {
        notificationService.testNotification();
      }, 1000);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
  };

  // 如果不支持通知或已有权限状态，不显示对话框
  if (!notificationService.isSupported() || permission !== 'default') {
    return null;
  }

  return (
    <Dialog
      open={showDialog}
      onClose={handleCancel}
      aria-labelledby="notification-dialog-title"
      aria-describedby="notification-dialog-description"
    >
      <DialogTitle id="notification-dialog-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NotificationsIcon color="primary" />
          <span>开启通知提醒</span>
        </div>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="notification-dialog-description">
          允许我们向您发送通知，以便在任务到期时提醒您。
          <br />
          <br />
          您可以随时在浏览器设置中更改此权限。
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="inherit">
          以后再说
        </Button>
        <Button onClick={handleRequestPermission} color="primary" variant="contained" autoFocus>
          允许通知
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationPermission;