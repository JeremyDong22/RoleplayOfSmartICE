// Notice response service - handles notice comments storage in Supabase
// Created: 2025-01-31
// Handles storage and retrieval of notice responses from roleplay_notice_responses table
// Updated: 2025-08-02 - Added test time support for date queries

import { supabase } from './supabase'
import { getRestaurantId } from '../utils/restaurantSetup'
import { getCurrentTestTime } from '../utils/globalTestTime'

export interface NoticeResponse {
  id?: string
  user_id: string
  restaurant_id: string
  task_id: string
  date: string
  response_content: string
  created_at?: string
}

// Submit a notice response
export async function submitNoticeResponse(
  userId: string,
  taskId: string,
  content: string
): Promise<NoticeResponse | null> {
  try {
    const restaurantId = await getRestaurantId()
    const testTime = getCurrentTestTime()
    const today = (testTime || new Date()).toISOString().split('T')[0]
    
    const response: Omit<NoticeResponse, 'id'> = {
      user_id: userId,
      restaurant_id: restaurantId,
      task_id: taskId,
      date: today,
      response_content: content,
      created_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('roleplay_notice_responses')
      .insert(response)
      .select()
      .single()
    
    if (error) {
      console.error('Error submitting notice response:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in submitNoticeResponse:', error)
    return null
  }
}

// Get today's notice responses for a user
export async function getTodayNoticeResponses(userId: string): Promise<NoticeResponse[]> {
  try {
    const testTime = getCurrentTestTime()
    const today = (testTime || new Date()).toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('roleplay_notice_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching notice responses:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getTodayNoticeResponses:', error)
    return []
  }
}

// Delete a notice response
export async function deleteNoticeResponse(responseId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('roleplay_notice_responses')
      .delete()
      .eq('id', responseId)
    
    if (error) {
      console.error('Error deleting notice response:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error in deleteNoticeResponse:', error)
    return false
  }
}