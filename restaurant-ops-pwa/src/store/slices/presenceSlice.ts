// Redux slice for managing online presence and real-time user status
// Created: 2025-07-22
// Features: Track online users, their roles, and last activity

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface OnlineUser {
  user_id: string;
  role: string;
  online_at: string;
  presence_ref?: string;
}

interface PresenceState {
  onlineUsers: OnlineUser[];
  lastSync: string | null;
}

const initialState: PresenceState = {
  onlineUsers: [],
  lastSync: null
};

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    updateOnlineUsers: (state, action: PayloadAction<OnlineUser[]>) => {
      state.onlineUsers = action.payload;
      state.lastSync = new Date().toISOString();
    },
    addOnlineUser: (state, action: PayloadAction<OnlineUser>) => {
      const existingIndex = state.onlineUsers.findIndex(
        user => user.user_id === action.payload.user_id
      );
      
      if (existingIndex >= 0) {
        state.onlineUsers[existingIndex] = action.payload;
      } else {
        state.onlineUsers.push(action.payload);
      }
    },
    removeOnlineUser: (state, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter(
        user => user.user_id !== action.payload
      );
    },
    clearPresence: (state) => {
      state.onlineUsers = [];
      state.lastSync = null;
    }
  }
});

export const { updateOnlineUsers, addOnlineUser, removeOnlineUser, clearPresence } = presenceSlice.actions;
export default presenceSlice.reducer;