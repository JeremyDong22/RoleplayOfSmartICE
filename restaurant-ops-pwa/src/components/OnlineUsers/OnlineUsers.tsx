// Component to display currently online users with their roles
// Created: 2025-07-22
// Features: Real-time presence indicator, role badges

import React from 'react';
import { Box, Typography, Avatar, AvatarGroup, Tooltip } from '@mui/material';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { green } from '@mui/material/colors';

const roleColors: Record<string, string> = {
  Manager: '#2196f3',
  Chef: '#ff9800',
  CEO: '#9c27b0',
  Staff: '#4caf50'
};

const roleLabels: Record<string, string> = {
  Manager: '经理',
  Chef: '厨师',
  CEO: '总监',
  Staff: '员工'
};

export const OnlineUsers: React.FC = () => {
  const onlineUsers = useSelector((state: RootState) => state.presence.onlineUsers);
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

  // Group users by role
  // const usersByRole = onlineUsers.reduce((acc, user) => {
  //   if (!acc[user.role]) {
  //     acc[user.role] = [];
  //   }
  //   acc[user.role].push(user);
  //   return acc;
  // }, {} as Record<string, typeof onlineUsers>);

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: green[500],
            animation: 'pulse 2s infinite'
          }}
        />
        <Typography variant="body2" color="text.secondary">
          在线
        </Typography>
      </Box>

      <AvatarGroup max={4} sx={{ ml: 1 }}>
        {onlineUsers.map((user) => (
          <Tooltip
            key={user.user_id}
            title={
              <Box>
                <Typography variant="caption">
                  {roleLabels[user.role] || user.role}
                </Typography>
                {user.user_id === currentUserId && (
                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.7 }}>
                    (你)
                  </Typography>
                )}
              </Box>
            }
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                backgroundColor: roleColors[user.role] || '#757575',
                fontSize: '0.875rem',
                border: user.user_id === currentUserId ? '2px solid #fff' : 'none'
              }}
            >
              {user.role.charAt(0)}
            </Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>

      <style>
        {`
          @keyframes pulse {
            0% {
              opacity: 1;
            }
            50% {
              opacity: 0.4;
            }
            100% {
              opacity: 1;
            }
          }
        `}
      </style>
    </Box>
  );
};