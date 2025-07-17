// Database types for Restaurant Operations Management System
export type UserRole = 'CEO' | 'Manager' | 'Chef' | 'Staff'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'late'
export type TaskTimeSlot = 'opening' | 'lunch_prep' | 'lunch_service' | 'lunch_closing' | 'dinner_prep' | 'dinner_service' | 'pre_closing' | 'closing'
export type Department = '前厅' | '后厨'

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: UserRole
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string
          role?: UserRole
          phone?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          template_id: string | null
          title: string
          description: string | null
          scheduled_date: string
          scheduled_start_time: string
          scheduled_end_time: string
          assigned_to: string | null
          assigned_by: string | null
          status: TaskStatus
          requires_photo: boolean
          requires_video: boolean
          requires_text: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          title: string
          description?: string | null
          scheduled_date: string
          scheduled_start_time: string
          scheduled_end_time: string
          assigned_to?: string | null
          assigned_by?: string | null
          status?: TaskStatus
          requires_photo?: boolean
          requires_video?: boolean
          requires_text?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          template_id?: string | null
          title?: string
          description?: string | null
          scheduled_date?: string
          scheduled_start_time?: string
          scheduled_end_time?: string
          assigned_to?: string | null
          assigned_by?: string | null
          status?: TaskStatus
          requires_photo?: boolean
          requires_video?: boolean
          requires_text?: boolean
          updated_at?: string
        }
      }
      task_submissions: {
        Row: {
          id: string
          task_id: string
          user_id: string
          status: TaskStatus
          submitted_at: string
          photo_urls: string[] | null
          video_urls: string[] | null
          text_notes: string | null
          is_late: boolean
          location_lat: number | null
          location_lng: number | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          status: TaskStatus
          submitted_at?: string
          photo_urls?: string[] | null
          video_urls?: string[] | null
          text_notes?: string | null
          is_late?: boolean
          location_lat?: number | null
          location_lng?: number | null
          created_at?: string
        }
        Update: {
          task_id?: string
          user_id?: string
          status?: TaskStatus
          submitted_at?: string
          photo_urls?: string[] | null
          video_urls?: string[] | null
          text_notes?: string | null
          is_late?: boolean
          location_lat?: number | null
          location_lng?: number | null
        }
      }
      task_templates: {
        Row: {
          id: string
          title: string
          description: string | null
          time_slot: TaskTimeSlot
          start_time: string
          end_time: string
          role: UserRole
          department: Department
          requires_photo: boolean
          requires_video: boolean
          requires_text: boolean
          alert_minutes_before: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          time_slot: TaskTimeSlot
          start_time: string
          end_time: string
          role: UserRole
          department: Department
          requires_photo?: boolean
          requires_video?: boolean
          requires_text?: boolean
          alert_minutes_before?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          time_slot?: TaskTimeSlot
          start_time?: string
          end_time?: string
          role?: UserRole
          department?: Department
          requires_photo?: boolean
          requires_video?: boolean
          requires_text?: boolean
          alert_minutes_before?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      team_hierarchy: {
        Row: {
          id: string
          manager_id: string
          subordinate_id: string
          created_at: string
        }
        Insert: {
          id?: string
          manager_id: string
          subordinate_id: string
          created_at?: string
        }
        Update: {
          manager_id?: string
          subordinate_id?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          title: string
          message: string | null
          type: 'task_reminder' | 'task_overdue' | 'task_assigned' | 'system'
          is_read: boolean
          sent_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id?: string | null
          title: string
          message?: string | null
          type: 'task_reminder' | 'task_overdue' | 'task_assigned' | 'system'
          is_read?: boolean
          sent_at?: string
        }
        Update: {
          user_id?: string
          task_id?: string | null
          title?: string
          message?: string | null
          type?: 'task_reminder' | 'task_overdue' | 'task_assigned' | 'system'
          is_read?: boolean
        }
      }
    }
  }
}