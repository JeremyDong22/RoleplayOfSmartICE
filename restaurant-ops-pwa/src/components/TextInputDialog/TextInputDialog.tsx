// Text input dialog component for recording text information
// Created for handling uploadRequirement: '记录' tasks
// Allows users to input text information (e.g., attendance records, business data)
// Updated to support loading placeholder text from sample files

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip
} from '@mui/material'
import {
  TextFields,
  Close as CloseIcon,
  Check,
  ContentPaste
} from '@mui/icons-material'
import { loadTaskSample } from '../../utils/sampleLoader'

interface TextInputDialogProps {
  open: boolean
  taskName: string
  taskId: string
  onClose: () => void
  onSubmit: (textInput: string) => void
}

const TextInputDialog: React.FC<TextInputDialogProps> = ({
  open,
  taskName,
  taskId,
  onClose,
  onSubmit
}) => {
  const [textInput, setTextInput] = useState('')
  const [samples, setSamples] = useState<string[]>([])
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number | null>(null)
  const [placeholder, setPlaceholder] = useState('请根据实际情况填写记录内容')

  // Load sample placeholder text when dialog opens
  useEffect(() => {
    if (!open) return
    
    // Load sample content for placeholder
    loadTaskSample(taskId).then(sample => {
      if (sample) {
        setPlaceholder(sample.content)
      } else {
        // Default placeholder if no sample found
        setPlaceholder('请根据实际情况填写记录内容')
      }
    }).catch(error => {
      console.error('Error loading sample:', error)
      setPlaceholder('请根据实际情况填写记录内容')
    })
  }, [open, taskId])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTextInput('')
      setSelectedSampleIndex(null)
    }
  }, [open])

  const handleSubmit = () => {
    if (textInput.trim()) {
      onSubmit(textInput.trim())
    }
  }

  const handleSelectSample = (index: number) => {
    setSelectedSampleIndex(index)
    setTextInput(samples[index])
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <TextFields color="primary" />
            <Typography variant="h6">记录信息</Typography>
          </Box>
          <Button
            startIcon={<CloseIcon />}
            onClick={onClose}
            size="small"
          >
            取消
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {taskName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Text Input Field */}
          <TextField
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            label="请输入记录内容"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={placeholder}
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '16px'
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'text.disabled',
                opacity: 0.8
              }
            }}
          />


          {/* Instructions */}
          <Alert severity="info" variant="outlined">
            请根据实际情况填写记录内容。
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={handleSubmit}
          disabled={!textInput.trim()}
          startIcon={<Check />}
        >
          确认提交
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TextInputDialog