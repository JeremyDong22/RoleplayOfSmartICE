// Universal task submission dialog that adapts to different task types
// Supports photo, audio, text, list/checklist, and no-requirement submissions
// Changes made:
// 1. Removed camera mode selection - now using unified PhotoSubmissionDialog
// 2. All photo tasks use the new three-layer interface structure
// 3. Added support for list/checklist tasks with ListSubmissionDialog
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Stepper,
  Step,
  StepLabel
} from '@mui/material'
import {
  PhotoCamera,
  Mic,
  TextFields,
  CheckCircle
} from '@mui/icons-material'
import PhotoSubmissionDialog from '../PhotoSubmissionDialog'
import AudioRecordingDialog from '../AudioRecordingDialog'
import TextInputDialog from '../TextInputDialog'
import ListSubmissionDialog from '../ListSubmissionDialog'
import type { TaskTemplate } from '../../utils/workflowParser'

interface TaskSubmissionDialogProps {
  open: boolean
  task: TaskTemplate | null
  isLateSubmission?: boolean
  initialPhotoGroups?: any[] // 新增：支持传入之前的照片组
  onClose: () => void
  onSubmit: (taskId: string, data: any) => void
}

export const TaskSubmissionDialog: React.FC<TaskSubmissionDialogProps> = ({
  open,
  task,
  isLateSubmission = false,
  initialPhotoGroups,
  onClose,
  onSubmit
}) => {
  const [step, setStep] = useState(0)
  const [explanation, setExplanation] = useState('')
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  
  // Early return if no task, before any logging
  if (!task) return null
  
  // Move console.log to useEffect to avoid logging on every render
  useEffect(() => {
    if (open) {
      console.log('[TaskSubmissionDialog] Dialog opened:', {
        taskId: task.id,
        taskTitle: task.title,
        uploadRequirement: task.uploadRequirement,
        isLateSubmission
      })
    }
  }, [open, task.id])
  
  const steps = isLateSubmission ? ['补交说明', '提交任务'] : ['提交任务']
  
  const handleExplanationConfirm = () => {
    if (isLateSubmission && step === 0) {
      setStep(1)
      setShowSubmissionDialog(true)
    }
  }
  
  const handleTaskSubmit = (data: any) => {
    // Include late submission explanation if applicable
    const submissionData = isLateSubmission 
      ? { ...data, lateExplanation: explanation }
      : data
      
    onSubmit(task.id, submissionData)
    handleClose()
  }
  
  const handleClose = () => {
    setStep(0)
    setExplanation('')
    setShowSubmissionDialog(false)
    onClose()
  }
  
  // Helper function to determine the correct sample directory for list tasks
  const getSampleDir = (task: TaskTemplate): string => {
    if (task.title.includes('开店准备与设备检查')) {
      return task.role === 'Manager' ? '前厅/1-开店-开店准备与设备检查' : '后厨/1-开店-开店准备与设备检查'
    }
    if (task.title.includes('开市寻店验收 - 物资准备')) {
      return '前厅/2 - 开市寻店验收 - 物资准备'
    }
    if (task.title.includes('开市寻店验收') && task.title.includes('物资准备')) {
      return '前厅/5-餐前准备晚市-开市寻店验收 - 物资准备'
    }
    // Default fallback
    return task.role === 'Manager' ? '前厅/1-开店-开店准备与设备检查' : '后厨/1-开店-开店准备与设备检查'
  }
  
  // Show explanation dialog for late submissions
  if (isLateSubmission && step === 0) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            补交任务说明
            <Stepper activeStep={0} sx={{ flex: 1, ml: 3 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            任务：{task.title}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {task.description}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="请说明未能按时完成的原因"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="请输入补交说明..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            取消
          </Button>
          <Button 
            onClick={handleExplanationConfirm} 
            color="error" 
            variant="contained"
            disabled={!explanation.trim()}
          >
            确认补交
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
  

  // Show appropriate submission dialog based on task requirements
  if (showSubmissionDialog || !isLateSubmission) {
    // For tasks requiring photo submission
    if (task.uploadRequirement === '拍照') {
      return (
        <PhotoSubmissionDialog
          open={open}
          taskName={task.title}
          taskId={task.id}
          initialPhotoGroups={initialPhotoGroups} // 传递初始照片组
          samples={task.samples}
          onClose={handleClose}
          onSubmit={(data) => {
            // console.log('[TaskSubmissionDialog] PhotoSubmissionDialog returned:', data)
            handleTaskSubmit({ ...data, type: 'photo' })
          }}
        />
      )
    }
    
    // For tasks requiring audio submission
    if (task.uploadRequirement === '录音') {
      // console.log('[TaskSubmissionDialog] Passing task to AudioRecordingDialog:', {
      //   taskId: task.id,
      //   taskTitle: task.title,
      //   samples: task.samples
      // })
      return (
        <AudioRecordingDialog
          open={open}
          taskName={task.title}
          taskId={task.id}
          samples={task.samples}
          onClose={handleClose}
          onSubmit={(transcription, audioBlob) => 
            handleTaskSubmit({ transcription, audioBlob, type: 'audio' })
          }
        />
      )
    }
    
    // For tasks requiring text submission
    if (task.uploadRequirement === '记录') {
      return (
        <TextInputDialog
          open={open}
          taskName={task.title}
          taskId={task.id}
          samples={task.samples}
          onClose={handleClose}
          onSubmit={(textInput) => handleTaskSubmit({ textInput, type: 'text' })}
        />
      )
    }
    
    // For tasks requiring list/checklist submission
    if (task.uploadRequirement === '列表') {
      return (
        <ListSubmissionDialog
          open={open}
          taskName={task.title}
          sampleDir={getSampleDir(task)}
          samples={task.samples}
          onClose={handleClose}
          onSubmit={(data) => handleTaskSubmit({ items: data.items, type: 'list' })}
        />
      )
    }
    
    // For tasks with no specific requirements
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle color="success" />
            确认完成任务
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            {task.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {task.description}
          </Typography>
          {isLateSubmission && (
            <Box mt={2} p={2} bgcolor="warning.light" borderRadius={1}>
              <Typography variant="caption" color="text.secondary">
                补交说明：{explanation}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            取消
          </Button>
          <Button 
            onClick={() => handleTaskSubmit({ type: 'confirmation' })} 
            color="primary" 
            variant="contained"
          >
            确认完成
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
  
  return null
}