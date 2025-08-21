// Test page for parallel upload functionality
// Created: 2025-08-21

import React, { useState } from 'react'
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip
} from '@mui/material'
import { Upload, DeleteForever, PlayArrow } from '@mui/icons-material'
import { submitTaskWithMedia } from '../utils/taskSubmissionHelper'
import { supabase } from '../services/supabase'
import { authService } from '../services/authService'

interface TestResult {
  config: string
  success: boolean
  duration?: number
  photosPerSecond?: string
  error?: string
}

export const TestParallelUpload: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [currentTest, setCurrentTest] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  // Function to create a base64 image
  const createTestImage = (sizeKB: number, index: number): string => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    const ctx = canvas.getContext('2d')!
    
    // Fill with color
    ctx.fillStyle = `hsl(${index * 30}, 70%, 50%)`
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Add text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`Test Image ${index + 1}`, canvas.width / 2, canvas.height / 2)
    ctx.font = '24px Arial'
    ctx.fillText(`~${sizeKB}KB`, canvas.width / 2, canvas.height / 2 + 60)
    
    // Adjust quality for target size
    let quality = 0.92
    if (sizeKB < 100) quality = 0.5
    else if (sizeKB < 200) quality = 0.7
    else if (sizeKB < 300) quality = 0.8
    
    return canvas.toDataURL('image/jpeg', quality)
  }

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const runTests = async () => {
    setIsRunning(true)
    setResults([])
    setLogs([])
    setProgress(0)
    
    addLog('=== PARALLEL UPLOAD TEST STARTED ===')
    addLog('Batch fallback strategy: 10 → 7 → 5 → 3')
    addLog('Timeout: 30 seconds per batch')
    
    const testConfigs = [
      { name: '10 photos (400KB each)', count: 10, sizeKB: 400 },
      { name: '17 photos (300KB each)', count: 17, sizeKB: 300 },
      { name: '20 photos (200KB each)', count: 20, sizeKB: 200 },
    ]
    
    const testResults: TestResult[] = []
    const currentUser = authService.getCurrentUser()
    const testUserId = currentUser?.id || 'test-user-' + Date.now()
    const testRestaurantId = currentUser?.restaurantId || 'test-restaurant'
    
    for (let testIndex = 0; testIndex < testConfigs.length; testIndex++) {
      const config = testConfigs[testIndex]
      setCurrentTest(config.name)
      addLog(`\n--- Testing: ${config.name} ---`)
      
      // Create test images
      const testImages = []
      for (let i = 0; i < config.count; i++) {
        testImages.push({
          photo: createTestImage(config.sizeKB, i),
          description: `Test photo ${i + 1}`
        })
      }
      
      const testData = {
        evidence: testImages
      }
      
      const startTime = Date.now()
      
      try {
        await submitTaskWithMedia({
          taskId: `test-task-${Date.now()}-${config.count}`,
          userId: testUserId,
          restaurantId: testRestaurantId,
          date: new Date().toISOString().split('T')[0],
          periodId: 'test-period',
          uploadRequirement: '拍照',
          data: testData,
          onProgress: (prog, msg) => {
            setProgress(prog)
            setProgressMessage(msg || '')
            if (msg) addLog(`Progress: ${prog}% - ${msg}`)
          },
          maxRetries: 3
        })
        
        const endTime = Date.now()
        const duration = (endTime - startTime) / 1000
        
        addLog(`✅ Success! Uploaded ${config.count} photos in ${duration.toFixed(2)} seconds`)
        addLog(`Average: ${(duration / config.count).toFixed(2)} seconds per photo`)
        
        testResults.push({
          config: config.name,
          success: true,
          duration,
          photosPerSecond: (config.count / duration).toFixed(2)
        })
        
      } catch (error: any) {
        addLog(`❌ Failed: ${error.message}`)
        testResults.push({
          config: config.name,
          success: false,
          error: error.message
        })
      }
      
      setResults([...testResults])
      
      // Delay between tests
      if (testIndex < testConfigs.length - 1) {
        addLog('Waiting 2 seconds before next test...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    setCurrentTest('')
    setProgress(0)
    setProgressMessage('')
    addLog('\n=== ALL TESTS COMPLETED ===')
    setIsRunning(false)
  }

  const cleanupTestData = async () => {
    setIsRunning(true)
    addLog('--- Starting cleanup ---')
    
    try {
      // Find and delete test photos
      const { data: files } = await supabase.storage
        .from('RolePlay')
        .list('photos')
      
      if (files && files.length > 0) {
        // Filter for test files (containing 'test-task')
        const testFiles = files.filter(f => f.name.includes('test-task'))
        
        if (testFiles.length > 0) {
          const filePaths = testFiles.map(f => `photos/${f.name}`)
          const { error } = await supabase.storage
            .from('RolePlay')
            .remove(filePaths)
          
          if (error) {
            addLog(`Error deleting photos: ${error.message}`)
          } else {
            addLog(`✅ Deleted ${filePaths.length} test photos`)
          }
        } else {
          addLog('No test photos found')
        }
      }
      
      // Delete test task records
      const { data: records, error: fetchError } = await supabase
        .from('roleplay_task_records')
        .select('id')
        .like('task_id', 'test-task%')
      
      if (records && records.length > 0) {
        const { error: deleteError } = await supabase
          .from('roleplay_task_records')
          .delete()
          .like('task_id', 'test-task%')
        
        if (deleteError) {
          addLog(`Error deleting records: ${deleteError.message}`)
        } else {
          addLog(`✅ Deleted ${records.length} test task records`)
        }
      } else {
        addLog('No test records found')
      }
      
      addLog('--- Cleanup completed ---')
    } catch (error: any) {
      addLog(`Cleanup error: ${error.message}`)
    }
    
    setIsRunning(false)
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Parallel Upload Test Suite
        </Typography>
        
        <Typography variant="body1" color="text.secondary" gutterBottom>
          This page tests the new parallel upload functionality with automatic batch size fallback.
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrow />}
            onClick={runTests}
            disabled={isRunning}
            size="large"
          >
            Run All Tests
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForever />}
            onClick={cleanupTestData}
            disabled={isRunning}
          >
            Clean Test Data
          </Button>
        </Box>
        
        {currentTest && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Current Test:</strong> {currentTest}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption">{progressMessage}</Typography>
              </Box>
            </Alert>
          </Box>
        )}
      </Paper>

      {results.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Test Results
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Test Configuration</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Duration (s)</TableCell>
                  <TableCell>Photos/Second</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.config}</TableCell>
                    <TableCell>
                      <Chip 
                        label={result.success ? 'Success' : 'Failed'}
                        color={result.success ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{result.duration?.toFixed(2) || '-'}</TableCell>
                    <TableCell>{result.photosPerSecond || '-'}</TableCell>
                    <TableCell>{result.error || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {logs.length > 0 && (
        <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            Test Logs
          </Typography>
          
          <Box
            sx={{
              maxHeight: 400,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              bgcolor: 'white',
              p: 2,
              borderRadius: 1,
              border: '1px solid #e0e0e0'
            }}
          >
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  )
}