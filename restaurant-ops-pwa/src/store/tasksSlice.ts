// Tasks slice for Redux store
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../services/supabase'
import type { Database, TaskStatus } from '../types/database'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskSubmission = Database['public']['Tables']['task_submissions']['Row']

interface TasksState {
  tasks: Task[]
  currentTask: Task | null
  submissions: TaskSubmission[]
  isLoading: boolean
  error: string | null
}

const initialState: TasksState = {
  tasks: [],
  currentTask: null,
  submissions: [],
  isLoading: false,
  error: null,
}

export const fetchTodayTasks = createAsyncThunk(
  'tasks/fetchToday',
  async (userId: string) => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('scheduled_date', today)
      .or(`assigned_to.eq.${userId},assigned_to.is.null`)
      .order('scheduled_start_time', { ascending: true })

    if (error) throw error
    return data
  }
)

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateStatus',
  async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    return data
  }
)

export const submitTask = createAsyncThunk(
  'tasks/submit',
  async (submission: {
    taskId: string
    userId: string
    photoUrls?: string[]
    videoUrls?: string[]
    textNotes?: string
  }) => {
    const now = new Date()
    const task = await supabase
      .from('tasks')
      .select('scheduled_end_time')
      .eq('id', submission.taskId)
      .single()

    const isLate = task.data ? new Date(task.data.scheduled_end_time) < now : false

    const { data, error } = await supabase
      .from('task_submissions')
      .insert({
        task_id: submission.taskId,
        user_id: submission.userId,
        status: 'completed',
        photo_urls: submission.photoUrls || null,
        video_urls: submission.videoUrls || null,
        text_notes: submission.textNotes || null,
        is_late: isLate,
      })
      .select()
      .single()

    if (error) throw error

    // Update task status
    await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', submission.taskId)

    return data
  }
)

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setCurrentTask: (state, action) => {
      state.currentTask = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Today's Tasks
      .addCase(fetchTodayTasks.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTodayTasks.fulfilled, (state, action) => {
        state.isLoading = false
        state.tasks = action.payload
      })
      .addCase(fetchTodayTasks.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch tasks'
      })
      // Update Task Status
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(task => task.id === action.payload.id)
        if (index !== -1) {
          state.tasks[index] = action.payload
        }
      })
      // Submit Task
      .addCase(submitTask.fulfilled, (state, action) => {
        state.submissions.push(action.payload)
        const taskIndex = state.tasks.findIndex(task => task.id === action.payload.task_id)
        if (taskIndex !== -1) {
          state.tasks[taskIndex].status = 'completed'
        }
      })
  },
})

export const { setCurrentTask, clearError } = tasksSlice.actions
export default tasksSlice.reducer