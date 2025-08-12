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
    // 如果是不同的用户，需要重新初始化
    if (this.userId && this.userId !== userId) {
      console.log('[RealtimeDutyService] 用户改变，需要重新初始化:', this.userId, '->', userId)
      await this.cleanup()
      this.isInitialized = false
      this.initializationPromise = null
    }
    
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
    // 如果已经是同一个用户且已初始化，直接返回
    if (this.userId === userId && this.isInitialized && this.channel) {
      console.log('[RealtimeDutyService] 已经为用户初始化，跳过重复初始化:', userId)
      return
    }
    
    this.userId = userId
    
    for (let i = 0; i < retries; i++) {
      try {
        // 如果有旧的channel，先清理
        if (this.channel) {
          console.log('[RealtimeDutyService] 清理旧的 channel')
          await this.channel.unsubscribe()
          this.channel = null
        }
        
        // 创建或加入频道 - 使用固定的频道名称，所有用户共享
        const channelName = 'duty-manager-broadcast'
        // 创建频道
        this.channel = supabase.channel(channelName, {
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
            // Subscription timeout
            reject(new Error('Supabase realtime subscription timeout'))
          }, 10000) // 10 second timeout
          
          this.channel!
            .on('broadcast', { event: 'duty-message' }, (payload) => {
              // 收到广播消息
              this.handleMessage(payload.payload as DutyManagerMessage)
            })
            .on('system', {}, (payload) => {
              // System messages are handled silently
            })
            .subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                clearTimeout(timeout)
                this.isInitialized = true
                // Connected to Realtime
                resolve()
              } else if (status === 'CLOSED') {
                clearTimeout(timeout)
                // Check if this is a normal close or an error
                if (err) {
                  // Connection closed with error
                  reject(new Error(`Connection closed with error: ${err}`))
                } else {
                  // Normal close, no need to log
                  // Don't reject on normal close, might be intentional
                  resolve()
                }
              } else if (status === 'CHANNEL_ERROR') {
                clearTimeout(timeout)
                // Check if this is a database connection error
                const errorMessage = err?.message || err?.toString() || 'Unknown error'
                if (errorMessage.includes('unable to connect to the project database')) {
                  // 数据库 Realtime 功能未启用，将在下次重试
                  // Don't reject immediately for database connection issues
                  // Will retry on next attempt
                } else {
                  // 频道错误
                  reject(new Error(`Channel error: ${errorMessage}`))
                }
              } else if (status === 'TIMED_OUT') {
                clearTimeout(timeout)
                // 订阅超时
                reject(new Error(`Connection timeout: ${err || 'Unknown error'}`))
              } else {
                // 订阅中间状态
              }
            })
        })
        
        // If we reach here, connection was successful
        return
      } catch (error) {
        // Initialize attempt failed
        if (i === retries - 1) {
          // No fallback - throw error if Realtime is unavailable
          // Supabase Realtime connection failed after all retries
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
    console.log('[RealtimeDutyService] 处理消息:', {
      type: message.type,
      sender: message.sender,
      timestamp: new Date(message.timestamp).toLocaleString(),
      data: message.data
    })
    
    // 通知所有监听器
    const listeners = this.listeners.get(message.type) || new Set()
    console.log(`[RealtimeDutyService] 找到 ${listeners.size} 个 ${message.type} 类型的监听器`)
    listeners.forEach(callback => {
      try {
        callback(message)
      } catch (error) {
        console.error('Error in realtime listener:', error)
      }
    })

    // 通知通用监听器
    const allListeners = this.listeners.get('*') || new Set()
    console.log(`[RealtimeDutyService] 找到 ${allListeners.size} 个通配符监听器`)
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
    console.log('[RealtimeDutyService] 准备发送消息:', {
      type,
      userId: this.userId,
      isInitialized: this.isInitialized,
      hasChannel: !!this.channel
    })
    
    // 如果服务未初始化，直接返回（数据库仍然会工作）
    if (!this.isInitialized) {
      console.warn('[RealtimeDutyService] 服务未初始化，跳过实时广播')
      return
    }
    
    // 等待初始化完成
    if (this.initializationPromise) {
      try {
        await this.initializationPromise
      } catch (error) {
        console.error('[RealtimeDutyService] 等待初始化失败:', error)
        return
      }
    }
    
    if (!this.channel || !this.userId) {
      console.warn('[RealtimeDutyService] 缺少 channel 或 userId:', {
        hasChannel: !!this.channel,
        userId: this.userId
      })
      return
    }

    const message: DutyManagerMessage = {
      type,
      sender: this.userId,
      timestamp: Date.now(),
      data
    }
    
    console.log('[RealtimeDutyService] 发送消息:', message)

    // Try to send via Supabase Realtime
    try {
      console.log('[RealtimeDutyService] 调用 channel.send...')
      const result = await this.channel.send({
        type: 'broadcast',
        event: 'duty-message',
        payload: message
      })
      console.log('[RealtimeDutyService] 发送结果:', result)
    } catch (error) {
      console.error('[RealtimeDutyService] 发送失败:', error)
      // 不抛出错误，让数据库操作继续
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