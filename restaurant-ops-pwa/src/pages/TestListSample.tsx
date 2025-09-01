// Test page to check list type sample structure
import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

export const TestListSample = () => {
  const [listTasks, setListTasks] = useState<any[]>([])
  
  useEffect(() => {
    checkListTasks()
  }, [])
  
  const checkListTasks = async () => {
    const { data, error } = await supabase
      .from('roleplay_tasks')
      .select('id, title, submission_type, samples')
      .eq('submission_type', 'list')
      .limit(5)
    
    if (error) {
      console.error('Error:', error)
      return
    }
    
    console.log('List type tasks:', data)
    setListTasks(data || [])
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>List Type Tasks Sample Structure</h1>
      {listTasks.map(task => (
        <div key={task.id} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <h3>{task.title}</h3>
          <p>Type: {task.submission_type}</p>
          <pre>{JSON.stringify(task.samples, null, 2)}</pre>
        </div>
      ))}
    </div>
  )
}