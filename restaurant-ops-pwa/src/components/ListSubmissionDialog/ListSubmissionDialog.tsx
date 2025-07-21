// List submission dialog for checklist-based tasks
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Alert,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

interface ListItem {
  id: string
  text: string
  status: 'unchecked' | 'checked' | 'failed'
}

interface ListSubmissionDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { items: ListItem[] }) => void
  taskName: string
  sampleDir?: string
}

export default function ListSubmissionDialog({
  open,
  onClose,
  onSubmit,
  taskName,
  sampleDir,
}: ListSubmissionDialogProps) {
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(false)

  // Load checklist items from sample files
  useEffect(() => {
    if (open && sampleDir) {
      loadChecklistItems()
    }
  }, [open, sampleDir])

  const loadChecklistItems = async () => {
    if (!sampleDir) return

    setLoading(true)
    try {
      // Try to load checklist configuration
      const response = await fetch(`/task-samples/${sampleDir}/checklist.json`)
      if (response.ok) {
        const data = await response.json()
        setItems(
          data.items.map((text: string, index: number) => ({
            id: `item-${index}`,
            text,
            status: 'unchecked' as const,
          }))
        )
      } else {
        // Fallback to txt files if no JSON config
        const files = ['带电设备检查.txt', '非带电设备检查.txt', '能源检查.txt']
        const allItems: ListItem[] = []
        
        for (const file of files) {
          try {
            const res = await fetch(`/task-samples/${sampleDir}/${file}`)
            if (res.ok) {
              const text = await res.text()
              // Parse text file to extract checklist items
              const lines = text.split('\n').filter(line => line.trim())
              const category = file.replace('.txt', '')
              
              lines.forEach((line, index) => {
                // Skip category headers and empty lines
                if (line.includes('：') || line.includes('检查清单') || line.includes('注意事项')) {
                  return
                }
                // Extract items that start with numbers or dashes
                const match = line.match(/^\d+\.\s*(.+)|^-\s*(.+)|^[^\d-].+/)
                if (match) {
                  const itemText = match[1] || match[2] || line.trim()
                  if (itemText && itemText.length > 2) {
                    allItems.push({
                      id: `${category}-${index}`,
                      text: `[${category}] ${itemText}`,
                      status: 'unchecked',
                    })
                  }
                }
              })
            }
          } catch (error) {
            console.error(`Error loading ${file}:`, error)
          }
        }
        
        setItems(allItems)
      }
    } catch (error) {
      console.error('Error loading checklist items:', error)
      // Set default items if loading fails
      setItems([
        { id: 'default-1', text: '设备运转正常', status: 'unchecked' },
        { id: 'default-2', text: '无损坏情况', status: 'unchecked' },
        { id: 'default-3', text: '能源供应正常', status: 'unchecked' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleItemClick = (itemId: string, newStatus: 'checked' | 'failed') => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, status: item.status === newStatus ? 'unchecked' : newStatus }
          : item
      )
    )
  }

  const handleSubmit = () => {
    // Check if all items have been checked
    const allChecked = items.every(item => item.status !== 'unchecked')
    
    if (!allChecked) {
      alert('请完成所有检查项')
      return
    }

    onSubmit({ items })
    handleClose()
  }

  const handleClose = () => {
    setItems([])
    onClose()
  }

  const getStatusIcon = (status: ListItem['status']) => {
    switch (status) {
      case 'checked':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />
      case 'failed':
        return <CancelIcon sx={{ color: 'error.main' }} />
      default:
        return <RadioButtonUncheckedIcon sx={{ color: 'text.disabled' }} />
    }
  }

  const completedCount = items.filter(item => item.status !== 'unchecked').length
  const totalCount = items.length

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{taskName} - 检查清单</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            完成进度: {completedCount}/{totalCount}
          </Typography>
          {completedCount < totalCount && (
            <Alert severity="info" sx={{ mt: 1 }}>
              请点击每个项目右侧的按钮进行检查
            </Alert>
          )}
        </Box>
        
        {loading ? (
          <Typography>加载检查项...</Typography>
        ) : (
          <List>
            {items.map((item) => (
              <ListItem
                key={item.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor:
                    item.status === 'checked'
                      ? 'success.lighter'
                      : item.status === 'failed'
                      ? 'error.lighter'
                      : 'background.paper',
                }}
              >
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    sx: {
                      textDecoration: item.status !== 'unchecked' ? 'line-through' : 'none',
                      color: item.status !== 'unchecked' ? 'text.secondary' : 'text.primary',
                    },
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    onClick={() => handleItemClick(item.id, 'checked')}
                    color={item.status === 'checked' ? 'success' : 'default'}
                  >
                    <CheckCircleIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleItemClick(item.id, 'failed')}
                    color={item.status === 'failed' ? 'error' : 'default'}
                  >
                    <CancelIcon />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={completedCount < totalCount}
        >
          提交 ({completedCount}/{totalCount})
        </Button>
      </DialogActions>
    </Dialog>
  )
}