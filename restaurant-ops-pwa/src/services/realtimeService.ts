// Realtime communication service for restaurant operations
// Created: 2025-07-22
// Features: WebSocket connection management, real-time updates, notification push

import { createClient } from '@supabase/supabase-js';
import { store } from '../store';

// Types for realtime events
export interface RealtimeEvent {
  type: 'task_update' | 'notification' | 'presence' | 'system_broadcast';
  payload: any;
}

export class RealtimeService {
  private supabase: any;
  private channels: Map<string, any> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );
  }

  // Subscribe to task updates
  subscribeToTasks(restaurantId: string) {
    const channel = this.supabase
      .channel(`tasks:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roleplay_task_records',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload: any) => {
          this.handleTaskUpdate(payload);
        }
      )
      .on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync();
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // console.log('Connected to realtime tasks');
        }
      });

    this.channels.set(`tasks:${restaurantId}`, channel);
  }

  // Subscribe to notifications
  subscribeToNotifications(userId: string) {
    const channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          this.handleNewNotification(payload);
        }
      )
      .subscribe();

    this.channels.set(`notifications:${userId}`, channel);
  }

  // Track online presence
  trackPresence(userId: string, role: string) {
    const channel = this.channels.get(`tasks:${store.getState().user.restaurantId}`);
    if (channel) {
      channel.track({
        user_id: userId,
        role: role,
        online_at: new Date().toISOString()
      });
    }
  }

  // Send system broadcast
  async sendBroadcast(message: string, priority: 'normal' | 'urgent' = 'normal') {
    const channel = this.supabase.channel('system_broadcast');
    await channel.send({
      type: 'broadcast',
      event: 'system_message',
      payload: {
        message,
        priority,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Handle task updates
  private handleTaskUpdate(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Dispatch to Redux store
    store.dispatch({
      type: 'tasks/realtimeUpdate',
      payload: {
        eventType,
        newRecord,
        oldRecord
      }
    });

    // Trigger UI notification if needed
    if (eventType === 'INSERT' && newRecord.assigned_to === store.getState().user.id) {
      this.showNotification('New task assigned to you');
    }
  }

  // Handle new notifications
  private handleNewNotification(payload: any) {
    const notification = payload.new;
    
    // Update Redux store
    store.dispatch({
      type: 'notifications/addNotification',
      payload: notification
    });

    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png'
      });
    }
  }

  // Handle presence sync
  private handlePresenceSync() {
    const channel = this.channels.get(`tasks:${store.getState().user.restaurantId}`);
    if (channel) {
      const state = channel.presenceState();
      const onlineUsers = Object.values(state).flat();
      
      store.dispatch({
        type: 'presence/updateOnlineUsers',
        payload: onlineUsers
      });
    }
  }

  // Show notification helper
  private showNotification(message: string) {
    if (Notification.permission === 'granted') {
      new Notification('Restaurant Ops', {
        body: message,
        icon: '/icon-192x192.png'
      });
    }
  }

  // Cleanup subscriptions
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  // Connection management
  async checkConnection() {
    const { data, error } = await this.supabase.from('roleplay_users').select('id').limit(1);
    return !error;
  }

  // Reconnect logic
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(async () => {
      if (await this.checkConnection()) {
        this.reconnectAttempts = 0;
        this.resubscribeAll();
      } else {
        this.reconnect();
      }
    }, delay);
  }

  // Resubscribe to all channels
  private resubscribeAll() {
    const state = store.getState();
    if (state.user.restaurantId) {
      this.subscribeToTasks(state.user.restaurantId);
    }
    if (state.user.id) {
      this.subscribeToNotifications(state.user.id);
      this.trackPresence(state.user.id, state.user.role);
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();