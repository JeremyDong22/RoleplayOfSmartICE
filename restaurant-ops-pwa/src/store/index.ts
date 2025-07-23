// Redux store configuration for restaurant operations management
// Updated: 2025-07-22 - Added presence slice for real-time user tracking
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import tasksReducer from './tasksSlice'
import notificationsReducer from './notificationsSlice'
import presenceReducer from './slices/presenceSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
    notifications: notificationsReducer,
    presence: presenceReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch