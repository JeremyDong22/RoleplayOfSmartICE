// Test page for Supabase Realtime functionality
// Created: 2025-07-22
// Updated: 2025-08-14 - Use singleton Supabase client to prevent multiple instances
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, List, ListItem, Chip } from '@mui/material';
import { getSupabase } from '../services/supabase';

const supabase = getSupabase();

export const TestRealtime: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [status, setStatus] = useState('Disconnected');
  const [channel, setChannel] = useState<any>(null);

  const connectToRealtime = () => {
    const testChannel = supabase
      .channel('test-channel')
      .on('presence', { event: 'sync' }, () => {
        // console.log('Presence synced');
        setStatus('Connected - Presence Active');
      })
      .on('broadcast', { event: 'test' }, (payload) => {
        // console.log('Broadcast received:', payload);
        setEvents(prev => [...prev, { type: 'broadcast', ...payload, time: new Date().toISOString() }]);
      })
      .subscribe((status) => {
        // console.log('Channel status:', status);
        setStatus(status);
      });

    setChannel(testChannel);
  };

  const sendBroadcast = () => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'test',
        payload: { message: 'Hello from Realtime!', timestamp: new Date().toISOString() }
      });
    }
  };

  const trackPresence = () => {
    if (channel) {
      channel.track({
        user: 'test-user',
        online_at: new Date().toISOString()
      });
    }
  };

  const disconnect = () => {
    if (channel) {
      supabase.removeChannel(channel);
      setChannel(null);
      setStatus('Disconnected');
    }
  };

  useEffect(() => {
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channel]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Supabase Realtime 测试
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          连接状态: <Chip label={status} color={status === 'SUBSCRIBED' ? 'success' : 'default'} />
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button 
            variant="contained" 
            onClick={connectToRealtime}
            disabled={channel !== null}
          >
            连接 Realtime
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={sendBroadcast}
            disabled={!channel}
          >
            发送广播消息
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={trackPresence}
            disabled={!channel}
          >
            更新在线状态
          </Button>
          
          <Button 
            variant="outlined" 
            color="error"
            onClick={disconnect}
            disabled={!channel}
          >
            断开连接
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          事件日志
        </Typography>
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {events.map((event, index) => (
            <ListItem key={index}>
              <Typography variant="body2">
                [{new Date(event.time).toLocaleTimeString()}] {event.type}: {JSON.stringify(event.payload)}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          测试说明：
          <br />1. 点击"连接 Realtime"建立 WebSocket 连接
          <br />2. 点击"发送广播消息"测试消息发送
          <br />3. 在另一个浏览器标签页打开相同页面，可以看到实时消息同步
          <br />4. 点击"更新在线状态"测试 Presence 功能
        </Typography>
      </Paper>
    </Box>
  );
};