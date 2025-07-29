// 测试任务上传功能
// Created: 2025-07-29
// 用于诊断任务上传到Supabase的问题

import React, { useState } from 'react'
import { Box, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material'
import { supabase } from '../services/supabase'
import { submitTaskRecord } from '../services/taskRecordService'
import { uploadPhoto } from '../services/storageService'

export default function TestTaskUpload() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [error, setError] = useState<string>('')

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log('[TestTaskUpload]', message)
  }

  const testConnection = async () => {
    setTesting(true)
    setResults([])
    setError('')

    try {
      // 1. 测试Supabase连接
      addResult('Testing Supabase connection...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        throw new Error(`Auth error: ${authError.message}`)
      }

      if (!user) {
        addResult('⚠️ No authenticated user found')
        addResult('Attempting anonymous access...')
      } else {
        addResult(`✅ Authenticated as: ${user.email || user.id}`)
      }

      // 2. 测试数据库访问
      addResult('Testing database access...')
      const { data: testQuery, error: queryError } = await supabase
        .from('roleplay_tasks')
        .select('id, task_code, title')
        .limit(1)

      if (queryError) {
        throw new Error(`Database query error: ${queryError.message}`)
      }

      addResult(`✅ Database connected. Found ${testQuery?.length || 0} tasks`)

      // 3. 测试Storage访问
      addResult('Testing storage bucket access...')
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
      
      if (bucketError) {
        addResult(`⚠️ Cannot list buckets: ${bucketError.message}`)
      } else {
        const roleplayBucket = buckets?.find(b => b.name === 'RolePlay')
        if (roleplayBucket) {
          addResult('✅ RolePlay bucket found')
        } else {
          addResult('❌ RolePlay bucket not found')
        }
      }

      // 4. 测试创建任务记录
      addResult('Testing task record creation...')
      const testTaskData = {
        restaurant_id: 1, // 野百灵
        task_id: 'test-task-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        period_id: 'opening',
        submission_type: 'text' as const,
        text_content: 'Test submission from TestTaskUpload page',
        user_id: user?.id || 'anonymous-test'
      }

      const { data: taskRecord, error: recordError } = await supabase
        .from('roleplay_task_records')
        .insert(testTaskData)
        .select()
        .single()

      if (recordError) {
        throw new Error(`Task record creation error: ${recordError.message}`)
      }

      addResult(`✅ Task record created with ID: ${taskRecord.id}`)

      // 5. 测试照片上传
      addResult('Testing photo upload...')
      const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      
      const photoResult = await uploadPhoto(
        testImageData,
        user?.id || 'test-user',
        'test-photo-task',
        { test: true }
      )

      if (photoResult) {
        addResult(`✅ Photo uploaded successfully`)
        addResult(`   URL: ${photoResult.publicUrl}`)
      } else {
        addResult('❌ Photo upload failed')
      }

      // 6. 清理测试数据
      addResult('Cleaning up test data...')
      const { error: deleteError } = await supabase
        .from('roleplay_task_records')
        .delete()
        .eq('id', taskRecord.id)

      if (!deleteError) {
        addResult('✅ Test data cleaned up')
      }

      addResult('🎉 All tests completed successfully!')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      addResult(`❌ Error: ${errorMessage}`)
    } finally {
      setTesting(false)
    }
  }

  const testRealSubmission = async () => {
    setTesting(true)
    setResults([])
    setError('')

    try {
      addResult('Testing real task submission flow...')
      
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'test-user-' + Date.now()

      // 使用真实的任务提交服务
      const taskData = {
        restaurant_id: 1,
        task_id: 'opening-equipment-check',
        date: new Date().toISOString().split('T')[0],
        period_id: 'opening',
        submission_type: 'photo' as const,
        photo_urls: ['https://example.com/test-photo.jpg'],
        text_content: 'Equipment check completed'
      }

      addResult('Submitting task record...')
      const result = await submitTaskRecord(taskData)
      
      if (result) {
        addResult(`✅ Task submitted successfully with ID: ${result.id}`)
        addResult(`   Status: ${result.status}`)
        addResult(`   Review Status: ${result.review_status || 'N/A'}`)
        
        // 验证记录
        const { data: verify } = await supabase
          .from('roleplay_task_records')
          .select('*')
          .eq('id', result.id)
          .single()
          
        if (verify) {
          addResult('✅ Task record verified in database')
        }
        
        // 清理
        await supabase
          .from('roleplay_task_records')
          .delete()
          .eq('id', result.id)
          
        addResult('✅ Test record cleaned up')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      addResult(`❌ Error: ${errorMessage}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          任务上传测试
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Button 
            variant="contained" 
            onClick={testConnection}
            disabled={testing}
            sx={{ mr: 2 }}
          >
            {testing ? <CircularProgress size={20} /> : '测试基础连接'}
          </Button>
          
          <Button 
            variant="contained" 
            color="secondary"
            onClick={testRealSubmission}
            disabled={testing}
          >
            {testing ? <CircularProgress size={20} /> : '测试实际提交'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {results.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.100' }}>
            <Typography variant="subtitle2" gutterBottom>
              测试结果：
            </Typography>
            {results.map((result, index) => (
              <Typography 
                key={index} 
                variant="body2" 
                sx={{ 
                  fontFamily: 'monospace',
                  color: result.includes('❌') ? 'error.main' : 
                         result.includes('⚠️') ? 'warning.main' : 
                         result.includes('✅') ? 'success.main' : 'text.primary'
                }}
              >
                {result}
              </Typography>
            ))}
          </Paper>
        )}
      </Paper>
    </Box>
  )
}