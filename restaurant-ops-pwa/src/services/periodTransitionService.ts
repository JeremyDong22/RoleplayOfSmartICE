// Period transition service - handles period state transitions in Supabase
// Created: 2025-01-31
// Handles storage and retrieval of period transitions from roleplay_period_transitions table

import { supabase } from './supabase'
import { getRestaurantId } from '../utils/restaurantSetup'

export interface PeriodTransition {
  id?: string
  user_id: string
  restaurant_id: string
  date: string
  period_id: string
  action: 'enter' | 'exit' | 'manual_close'
  timestamp: string
  created_at?: string
}

// Record a period transition
export async function recordPeriodTransition(
  userId: string,
  periodId: string,
  action: 'enter' | 'exit' | 'manual_close'
): Promise<PeriodTransition | null> {
  try {
    const restaurantId = await getRestaurantId()
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const transition: Omit<PeriodTransition, 'id'> = {
      user_id: userId,
      restaurant_id: restaurantId,
      date: today,
      period_id: periodId,
      action: action,
      timestamp: now.toISOString(),
      created_at: now.toISOString()
    }
    
    const { data, error } = await supabase
      .from('roleplay_period_transitions')
      .insert(transition)
      .select()
      .single()
    
    if (error) {
      console.error('Error recording period transition:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in recordPeriodTransition:', error)
    return null
  }
}

// Get today's transitions for a user
export async function getTodayTransitions(userId: string): Promise<PeriodTransition[]> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('roleplay_period_transitions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('timestamp', { ascending: true })
    
    if (error) {
      console.error('Error fetching transitions:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getTodayTransitions:', error)
    return []
  }
}

// Check if user has manually closed today
export async function hasManuallyClosedToday(userId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('roleplay_period_transitions')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('action', 'manual_close')
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error checking manual close:', error)
      return false
    }
    
    return !!data
  } catch (error) {
    console.error('Error in hasManuallyClosedToday:', error)
    return false
  }
}

// Get the latest transition for today
export async function getLatestTransition(userId: string): Promise<PeriodTransition | null> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('roleplay_period_transitions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching latest transition:', error)
      return null
    }
    
    return data || null
  } catch (error) {
    console.error('Error in getLatestTransition:', error)
    return null
  }
}