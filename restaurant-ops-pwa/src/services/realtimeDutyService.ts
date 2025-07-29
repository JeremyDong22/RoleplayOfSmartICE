// 值班经理任务实时通信服务
// 使用 Supabase Realtime 实现跨设备实时通信

import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { DutyManagerSubmission } from '../contexts/DutyManagerContext'

interface DutyManagerMessage {
  type: 'TRIGGER' | 'SUBMISSION' | 'REVIEW_STATUS' | 'CLEAR_SUBMISSIONS'
  sender: string // user id
  timestamp: number
  data: any
}

class RealtimeDutyService {
  private channel: RealtimeChannel | null = null
  private listeners: Map<string, Set<(message: DutyManagerMessage) => void>> = new Map()
  private userId: string | null = null
  private isInitialized: boolean = false
  private initializationPromise: Promise<void> | null = null
  // private useFallback: boolean = false // Removed: No localStorage fallback

  async initialize(userId: string) {
    // 如果已经初始化或正在初始化，返回现有的promise
    if (this.isInitialized) {
      return
    }
    if (this.initializationPromise) {
      return this.initializationPromise
    }
    
    this.initializationPromise = this._doInitialize(userId)
    return this.initializationPromise
  }

  private async _doInitialize(userId: string, retries = 3) {
    this.userId = userId
    
    for (let i = 0; i < retries; i++) {
      try {
        // 如果有旧的channel，先清理
        if (this.channel) {
          await this.channel.unsubscribe()
          this.channel = null
        }
        
        // 创建或加入频道
        this.channel = supabase.channel('duty-manager-channel', {
          config: {
            broadcast: {
              self: false, // 不接收自己发送的消息
              ack: true // 等待服务器确认
            },
            presence: {
              key: userId
            }
          }
        })

        // 监听广播消息
        await new Promise<void>((resolve, reject) => {
          // Add a timeout in case subscription doesn't respond
          const timeout = setTimeout(() => {
            console.error('[RealtimeDutyService] Subscription timeout, attempt', i + 1)
            reject(new Error('Supabase realtime subscription timeout'))
          }, 10000) // 10 second timeout
          
          this.channel!
            .on('broadcast', { event: 'duty-message' }, (payload) => {
              this.handleMessage(payload.payload as DutyManagerMessage)
            })
            .subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                clearTimeout(timeout)
                this.isInitialized = true
                console.log('[RealtimeDutyService] ✓ Connected to Supabase Realtime')
                resolve()
              } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                clearTimeout(timeout)
                // Don't log error here, will be handled in catch block
                reject(new Error(`Connection ${status}`))
              }
            })
        })
        
        // If we reach here, connection was successful
        return
      } catch (error) {
        console.error(`[RealtimeDutyService] Initialize attempt ${i + 1} failed:`, error)
        if (i === retries - 1) {
          // No fallback - throw error if Realtime is unavailable
          console.error('[RealtimeDutyService] ❌ Supabase Realtime connection failed after all retries')
          throw new Error('Supabase Realtime connection failed')
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }
  
  // Removed: localStorage fallback methods
  /*
  private startFallbackPolling() {
    // Poll localStorage for messages every second
    setInterval(() => {
      const messages = this.getFallbackMessages()
      messages.forEach(msg => {
        if (msg.sender !== this.userId) {
          this.handleMessage(msg)
        }
      })
    }, 1000)
  }
  
  private getFallbackMessages(): DutyManagerMessage[] {
    const stored = localStorage.getItem('duty-manager-fallback-messages')
    if (!stored) return []
    
    try {
      const messages = JSON.parse(stored) as DutyManagerMessage[]
      // Only return messages from the last 30 seconds
      const cutoff = Date.now() - 30000
      return messages.filter(msg => msg.timestamp > cutoff)
    } catch {
      return []
    }
  }
  
  private storeFallbackMessage(message: DutyManagerMessage) {
    const messages = this.getFallbackMessages()
    messages.push(message)
    // Keep only last 50 messages
    const recent = messages.slice(-50)
    localStorage.setItem('duty-manager-fallback-messages', JSON.stringify(recent))
  }
  */

  private handleMessage(message: DutyManagerMessage) {
    // 通知所有监听器
    const listeners = this.listeners.get(message.type) || new Set()
    listeners.forEach(callback => {
      try {
        callback(message)
      } catch (error) {
        console.error('Error in realtime listener:', error)
      }
    })

    // 通知通用监听器
    const allListeners = this.listeners.get('*') || new Set()
    allListeners.forEach(callback => {
      try {
        callback(message)
      } catch (error) {
        console.error('Error in realtime listener:', error)
      }
    })
  }

  // 发送消息
  async send(type: DutyManagerMessage['type'], data: any) {
    // 等待初始化完成
    if (!this.isInitialized && this.initializationPromise) {
      await this.initializationPromise
    }
    
    if (!this.channel || !this.userId || !this.isInitialized) {
      console.error('[RealtimeDutyService] Not initialized')
      throw new Error('Realtime service not initialized')
    }

    const message: DutyManagerMessage = {
      type,
      sender: this.userId,
      timestamp: Date.now(),
      data
    }

    // Only use Supabase Realtime - no fallback
    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'duty-message',
        payload: message
      })
    } catch (error) {
      console.error('[RealtimeDutyService] Send failed:', error)
      throw error
    }
  }

  // 订阅消息
  subscribe(
    type: DutyManagerMessage['type'] | '*',
    callback: (message: DutyManagerMessage) => void
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    
    this.listeners.get(type)!.add(callback)
    
    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(type)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.listeners.delete(type)
        }
      }
    }
  }

  // 发送具体类型的消息
  async sendTrigger(trigger: any) {
    await this.send('TRIGGER', { trigger })
  }

  async sendSubmission(submission: DutyManagerSubmission) {
    await this.send('SUBMISSION', { submission })
  }

  async sendReviewStatus(taskId: string, reviewData: any) {
    await this.send('REVIEW_STATUS', { taskId, reviewData })
  }

  async clearSubmissions() {
    await this.send('CLEAR_SUBMISSIONS', {})
  }

  // 清理
  cleanup() {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }
    this.listeners.clear()
    this.isInitialized = false
    this.initializationPromise = null
    this.userId = null
    // this.useFallback = false // Removed
    
    // Clear fallback messages on cleanup - Removed
    // if (this.useFallback) {
    //   localStorage.removeItem('duty-manager-fallback-messages')
    // }
  }
}

export const realtimeDutyService = new RealtimeDutyService()