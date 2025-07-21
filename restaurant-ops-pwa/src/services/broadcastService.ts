// BroadcastChannel service for real-time cross-tab communication
// This service handles communication between Manager and Chef dashboards

export interface BroadcastMessage {
  type: 'LAST_CUSTOMER_LEFT_LUNCH' | 'LAST_CUSTOMER_LEFT_DINNER' | 'PERIOD_CHANGED' | 'TASK_COMPLETED' | 'STATE_SYNC'
  timestamp: number
  data?: any
  sender: 'manager' | 'chef' | 'ceo'
}

class BroadcastService {
  private channel: BroadcastChannel | null = null
  private listeners: Map<string, Set<(message: BroadcastMessage) => void>> = new Map()
  private isSupported: boolean

  constructor() {
    // Check if BroadcastChannel is supported
    this.isSupported = typeof BroadcastChannel !== 'undefined'
    
    if (this.isSupported) {
      this.initialize()
    } else {
      console.warn('BroadcastChannel is not supported. Falling back to localStorage events.')
    }
  }

  private initialize() {
    try {
      // Create a channel for restaurant operations
      this.channel = new BroadcastChannel('restaurant-ops-channel')
      
      // Set up message handler
      this.channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        this.handleMessage(event.data)
      }
      
      // Handle errors
      this.channel.onmessageerror = (event) => {
        console.error('BroadcastChannel message error:', event)
      }
      
      console.log('BroadcastChannel initialized successfully')
    } catch (error) {
      console.error('Failed to initialize BroadcastChannel:', error)
      this.isSupported = false
    }
  }

  private handleMessage(message: BroadcastMessage) {
    console.log('Received broadcast message:', message)
    
    // Notify all listeners for this message type
    const listeners = this.listeners.get(message.type)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message)
        } catch (error) {
          console.error('Error in broadcast listener:', error)
        }
      })
    }
    
    // Also notify listeners for all messages
    const allListeners = this.listeners.get('*')
    if (allListeners) {
      allListeners.forEach(callback => {
        try {
          callback(message)
        } catch (error) {
          console.error('Error in broadcast listener:', error)
        }
      })
    }
  }

  // Send a message to all other tabs
  send(type: BroadcastMessage['type'], data?: any, sender?: BroadcastMessage['sender']) {
    const message: BroadcastMessage = {
      type,
      timestamp: Date.now(),
      data,
      sender: sender || 'manager'
    }
    
    if (this.isSupported && this.channel) {
      try {
        this.channel.postMessage(message)
        console.log('Broadcast message sent:', message)
      } catch (error) {
        console.error('Failed to send broadcast message:', error)
        this.fallbackToLocalStorage(message)
      }
    } else {
      this.fallbackToLocalStorage(message)
    }
  }

  // Subscribe to messages
  subscribe(type: BroadcastMessage['type'] | '*', callback: (message: BroadcastMessage) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    
    this.listeners.get(type)!.add(callback)
    
    // Return unsubscribe function
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

  // Fallback to localStorage for browsers that don't support BroadcastChannel
  private fallbackToLocalStorage(message: BroadcastMessage) {
    try {
      const key = `broadcast_${Date.now()}_${Math.random()}`
      localStorage.setItem(key, JSON.stringify(message))
      
      // Clean up after a short delay
      setTimeout(() => {
        localStorage.removeItem(key)
      }, 1000)
    } catch (error) {
      console.error('Failed to use localStorage fallback:', error)
    }
  }

  // Listen to storage events as fallback
  setupStorageFallback() {
    if (!this.isSupported) {
      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith('broadcast_') && event.newValue) {
          try {
            const message = JSON.parse(event.newValue) as BroadcastMessage
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse storage event:', error)
          }
        }
      })
    }
  }

  // Clean up
  destroy() {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    this.listeners.clear()
  }
}

// Export singleton instance
export const broadcastService = new BroadcastService()

// Setup storage fallback on initialization
if (typeof window !== 'undefined') {
  broadcastService.setupStorageFallback()
}