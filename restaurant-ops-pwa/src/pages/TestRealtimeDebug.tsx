// Test page for debugging Supabase Realtime connection
import React, { useState, useEffect } from 'react'
import { Box, Button, Typography, Paper, Alert } from '@mui/material'
import { realtimeDutyService } from '../services/realtimeDutyService'
import { authService } from '../services/authService'

export const TestRealtimeDebug: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(`[TestRealtimeDebug] ${message}`)
  }

  const testConnection = async () => {
    setError(null)
    setLogs([])
    
    try {
      // Get current user
      const user = authService.getCurrentUser()
      const userId = user?.id || 'test-user-' + Date.now()
      addLog(`Using userId: ${userId}`)
      
      // Test initialization
      addLog('Starting Realtime initialization...')
      await realtimeDutyService.initialize(userId)
      addLog('✓ Realtime service initialized')
      setIsConnected(true)
      
      // Subscribe to messages
      addLog('Setting up message subscription...')
      const unsubscribe = realtimeDutyService.subscribe('*', (message) => {
        addLog(`Received message: ${JSON.stringify(message)}`)
      })
      
      // Test sending a message
      addLog('Testing message send...')
      await realtimeDutyService.send('TRIGGER', { 
        test: true, 
        timestamp: Date.now() 
      })
      addLog('✓ Test message sent')
      
      // Keep subscription for 10 seconds
      setTimeout(() => {
        unsubscribe()
        addLog('Unsubscribed from messages')
      }, 10000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      addLog(`❌ Error: ${errorMessage}`)
      setIsConnected(false)
    }
  }

  const testBroadcast = async () => {
    try {
      addLog('Sending broadcast message...')
      await realtimeDutyService.send('SUBMISSION', {
        submission: {
          taskId: 'test-task',
          taskTitle: 'Test Task',
          submittedAt: new Date(),
          content: {
            text: 'This is a test submission'
          }
        }
      })
      addLog('✓ Broadcast sent')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      addLog(`❌ Broadcast error: ${errorMessage}`)
    }
  }

  const cleanup = () => {
    realtimeDutyService.cleanup()
    setIsConnected(false)
    addLog('Cleaned up Realtime service')
  }

  useEffect(() => {
    return () => {
      realtimeDutyService.cleanup()
    }
  }, [])

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Supabase Realtime Debug
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          onClick={testConnection}
          disabled={isConnected}
        >
          Test Connection
        </Button>
        
        <Button 
          variant="contained" 
          color="secondary"
          onClick={testBroadcast}
          disabled={!isConnected}
        >
          Send Test Broadcast
        </Button>
        
        <Button 
          variant="outlined" 
          color="error"
          onClick={cleanup}
          disabled={!isConnected}
        >
          Cleanup
        </Button>
      </Box>
      
      <Paper sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: 400, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Logs:
        </Typography>
        {logs.length === 0 ? (
          <Typography color="text.secondary">
            Click "Test Connection" to start debugging
          </Typography>
        ) : (
          logs.map((log, index) => (
            <Typography 
              key={index} 
              variant="body2" 
              sx={{ fontFamily: 'monospace', mb: 0.5 }}
            >
              {log}
            </Typography>
          ))
        )}
      </Paper>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Open this page in two browser tabs to test cross-device communication.
          Check the browser console for detailed logs.
        </Typography>
      </Box>
    </Box>
  )
}