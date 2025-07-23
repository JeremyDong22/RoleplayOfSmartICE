// 值班经理任务实时通信服务
// 使用 Supabase Realtime 实现跨设备实时通信

import { supabase } from '../utils/supabase'
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

  async initialize(userId: string) {
    this.userId = userId
    
    // 创建或加入频道
    this.channel = supabase.channel('duty-manager-channel', {
      config: {
        broadcast: {
          self: false // 不接收自己发送的消息
        }
      }
    })

    // 监听广播消息
    this.channel
      .on('broadcast', { event: 'duty-message' }, (payload) => {
        this.handleMessage(payload.payload as DutyManagerMessage)
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })
  }

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
    if (!this.channel || !this.userId) {
      console.error('Realtime service not initialized')
      return
    }

    const message: DutyManagerMessage = {
      type,
      sender: this.userId,
      timestamp: Date.now(),
      data
    }

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'duty-message',
        payload: message
      })
    } catch (error) {
      console.error('Failed to send realtime message:', error)
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
  }
}

export const realtimeDutyService = new RealtimeDutyService()