// Sample Manager Types
// Types for managing task samples across restaurants and roles

export interface SampleSession {
  id: string
  index: number
  type: 'images' | 'checklist' | 'text'
  images?: string[]
  text?: string
  checklist?: {
    items: string[]
  }
}

export interface TaskSample {
  taskId: string
  title: string
  description?: string
  sessions: SampleSession[]
  roleCode: string
  periodId: string
  restaurantId: string
  lastUpdated?: string
}

export interface SampleManagerState {
  selectedRestaurant: string | null
  selectedRole: string | null
  selectedPeriod: string | null
  selectedTask: string | null
  isEditing: boolean
}

export interface Restaurant {
  id: string
  name: string
  address?: string
  city?: string
  icon?: string
  is_active: boolean
}

export interface Role {
  id: string
  role_code: string
  role_name_zh: string
  role_name_en: string
  department: string | null
}

export interface WorkflowPeriod {
  id: string
  name: string
  display_name: string
  start_time: string
  end_time: string
  display_order: number
}

export interface Task {
  id: string
  title: string
  description: string | null
  role_code: string
  period_id: string | null
  submission_type: string | null
  samples?: any
  restaurant_id?: string
  is_active: boolean
}