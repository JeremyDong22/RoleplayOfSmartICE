import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Box, Typography, Paper, CircularProgress } from '@mui/material'

export default function TestFloatingTasks() {
  const [loading, setLoading] = useState(true)
  const [floatingTasks, setFloatingTasks] = useState<any[]>([])
  const [allTasks, setAllTasks] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testQuery() {
      console.log('🧪 Testing direct Supabase query...')
      
      try {
        // Test 1: Query all tasks
        const { data: allData, error: allError } = await supabase
          .from('roleplay_tasks')
          .select('*')
          .order('id')
        
        if (allError) {
          console.error('Error querying all tasks:', allError)
          setError(`All tasks error: ${allError.message}`)
          return
        }
        
        console.log('✅ All tasks query successful:', allData?.length, 'tasks')
        setAllTasks(allData || [])
        
        // Test 2: Query floating tasks specifically
        const { data: floatingData, error: floatingError } = await supabase
          .from('roleplay_tasks')
          .select('*')
          .eq('is_floating', true)
          .order('id')
        
        if (floatingError) {
          console.error('Error querying floating tasks:', floatingError)
          setError(`Floating tasks error: ${floatingError.message}`)
          return
        }
        
        console.log('✅ Floating tasks query successful:', floatingData?.length, 'tasks')
        console.log('Floating tasks data:', floatingData)
        setFloatingTasks(floatingData || [])
        
      } catch (err) {
        console.error('Unexpected error:', err)
        setError(`Unexpected error: ${err}`)
      } finally {
        setLoading(false)
      }
    }
    
    testQuery()
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>Direct Supabase Query Test</Typography>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" mb={2}>All Tasks Summary</Typography>
        <Typography>Total tasks: {allTasks.length}</Typography>
        <Typography>Tasks with is_floating=true: {allTasks.filter(t => t.is_floating === true).length}</Typography>
        <Typography>Tasks with id starting with 'floating': {allTasks.filter(t => t.id.startsWith('floating')).length}</Typography>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" mb={2}>Floating Tasks ({floatingTasks.length})</Typography>
        {floatingTasks.map(task => (
          <Box key={task.id} mb={2} p={1} bgcolor="grey.100">
            <Typography><strong>ID:</strong> {task.id}</Typography>
            <Typography><strong>Title:</strong> {task.title}</Typography>
            <Typography><strong>Role:</strong> {task.role_code}</Typography>
            <Typography><strong>is_floating:</strong> {String(task.is_floating)}</Typography>
            <Typography><strong>period_id:</strong> {task.period_id || 'null'}</Typography>
          </Box>
        ))}
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Debug: First 5 tasks raw data</Typography>
        <pre style={{ overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(allTasks.slice(0, 5), null, 2)}
        </pre>
      </Paper>
    </Box>
  )
}