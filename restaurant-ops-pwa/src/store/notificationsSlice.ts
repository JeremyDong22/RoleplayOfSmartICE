// Notifications slice for Redux store
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../services/supabase'
import type { Database } from '../types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
}

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  }
)

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) throw error
    return data
  }
)

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
  }
)

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload)
      if (!action.payload.is_read) {
        state.unreadCount += 1
      }
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false
        state.notifications = action.payload
        state.unreadCount = action.payload.filter(n => !n.is_read).length
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch notifications'
      })
      // Mark as Read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n.id === action.payload.id)
        if (index !== -1) {
          state.notifications[index] = action.payload
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      })
      // Mark All as Read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map(n => ({ ...n, is_read: true }))
        state.unreadCount = 0
      })
  },
})

export const { addNotification, clearError } = notificationsSlice.actions
export default notificationsSlice.reducer