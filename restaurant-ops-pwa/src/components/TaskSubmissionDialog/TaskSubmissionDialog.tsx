// Universal task submission dialog that adapts to different task types
// Supports photo, audio, text, list/checklist, and no-requirement submissions
// Changes made:
// 1. Removed camera mode selection - now using unified PhotoSubmissionDialog
// 2. All photo tasks use the new three-layer interface structure
// 3. Added support for list/checklist tasks with ListSubmissionDialog
// 4. Added face recognition verification for task accountability
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
import { FaceVerificationDialog } from '../FaceVerification'
import { authService } from '../../services/authService'
import { faceIOService } from '../../services/faceIOService'
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
  const [showFaceVerification, setShowFaceVerification] = useState(false)
  const [pendingSubmissionData, setPendingSubmissionData] = useState<any>(null)
  const [isUserEnrolled, setIsUserEnrolled] = useState(false)
  
  // Debug: Track component lifecycle
  useEffect(() => {
    console.log('📍 [TaskSubmissionDialog] Component mounted/updated')
    return () => {
      console.log('📍 [TaskSubmissionDialog] Component unmounting')
    }
  }, [])
  
  // Check face enrollment when dialog opens
  useEffect(() => {
    if (open && task) {
      console.log('🔍 [FaceRecognition] TaskSubmissionDialog opened, checking enrollment...')
      console.log('📋 [FaceRecognition] Task details:', {
        id: task.id,
        title: task.title,
        uploadRequirement: task.uploadRequirement,
        isFloating: task.isFloating
      })
      checkUserEnrollment()
    }
  }, [open, task?.id])
  
  // Early return if no task - MUST be after all hooks
  if (!task) return null
  
  // Check if current user has enrolled their face
  const checkUserEnrollment = async () => {
    const user = authService.getCurrentUser()
    console.log('👤 [FaceRecognition] Current user:', user)
    if (user) {
      try {
        const enrolled = await faceIOService.hasUserEnrolled(user.id)
        console.log(`✅ [FaceRecognition] User enrollment status: ${enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`)
        setIsUserEnrolled(enrolled)
      } catch (error) {
        console.error('❌ [FaceRecognition] Failed to check enrollment:', error)
      }
    } else {
      console.warn('⚠️ [FaceRecognition] No user logged in!')
    }
  }
  
  const steps = isLateSubmission ? ['补交说明', '提交任务'] : ['提交任务']
  
  const handleExplanationConfirm = () => {
    if (isLateSubmission && step === 0) {
      setStep(1)
      setShowSubmissionDialog(true)
    }
  }
  
  const handleTaskSubmit = (data: any) => {
    console.log('🚀 [FaceRecognition] Task submitted, triggering face verification...')
    // Store submission data and show face verification
    const submissionData = isLateSubmission 
      ? { ...data, lateExplanation: explanation }
      : data
    
    setPendingSubmissionData(submissionData)
    setShowFaceVerification(true)
    console.log('📸 [FaceRecognition] Face verification dialog should open now!')
    console.log('📸 [FaceRecognition] Current state - showFaceVerification:', true)
    console.log('📸 [FaceRecognition] Current state - open:', open)
  }
  
  // Handle face verification result
  const handleFaceVerified = (verificationData: any) => {
    console.log('✅ [FaceRecognition] Face verified successfully!', verificationData)
    // Face verification passed, submit the task with original data
    // No need to add verification fields - user_id already indicates who submitted
    onSubmit(task.id, pendingSubmissionData)
    handleClose()
  }
  
  const handleClose = () => {
    setStep(0)
    setExplanation('')
    setShowSubmissionDialog(false)
    setShowFaceVerification(false)
    setPendingSubmissionData(null)
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
  

  // Get current user for face verification
  const currentUser = authService.getCurrentUser()
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 [FaceRecognition] State changed - showFaceVerification:', showFaceVerification)
    if (showFaceVerification) {
      console.log('🔍 [FaceRecognition] Debug - currentUser:', currentUser)
      console.log('🔍 [FaceRecognition] Should render FaceVerificationDialog now!')
      if (!currentUser) {
        console.error('❌ [FaceRecognition] ERROR: currentUser is null - Face verification dialog will not show!')
      }
    }
  }, [showFaceVerification])

  // Show appropriate submission dialog based on task requirements
  if (showSubmissionDialog || !isLateSubmission) {
    // For tasks requiring photo submission
    if (task.uploadRequirement === '拍照') {
      return (
        <>
          <PhotoSubmissionDialog
            open={open && !showFaceVerification}
            taskName={task.title}
            taskId={task.id}
            initialPhotoGroups={initialPhotoGroups} // 传递初始照片组
            samples={task.samples}
            onClose={() => {
              if (!showFaceVerification) {
                handleClose()
              }
            }}
            onSubmit={(data) => {
              handleTaskSubmit({ ...data, type: 'photo' })
              // Don't let PhotoSubmissionDialog close itself - we'll handle it
              return false
            }}
          />
          {/* Real Face Verification Dialog */}
          <FaceVerificationDialog
            open={showFaceVerification}
            userId={currentUser?.id || 'unknown-user'}
            userName={currentUser?.name || currentUser?.display_name || 'Unknown User'}
            taskTitle={task.title}
            mode={isUserEnrolled ? 'verification' : 'enrollment'}
            onVerified={handleFaceVerified}
            onClose={() => {
              console.log('❌ [FaceRecognition] Face verification cancelled')
              setShowFaceVerification(false)
              setPendingSubmissionData(null)
              handleClose() // Close everything when face verification is cancelled
            }}
          />
        </>
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
        <>
          <AudioRecordingDialog
            open={open && !showFaceVerification}
            taskName={task.title}
            taskId={task.id}
            samples={task.samples}
            onClose={() => {
              if (!showFaceVerification) {
                handleClose()
              }
            }}
            onSubmit={(transcription, audioBlob) => 
              handleTaskSubmit({ transcription, audioBlob, type: 'audio' })
            }
          />
          {/* Face Verification Dialog */}
          <FaceVerificationDialog
            open={showFaceVerification}
            userId={currentUser?.id || 'unknown-user'}
            userName={currentUser?.name || currentUser?.display_name || 'Unknown User'}
            taskTitle={task.title}
            mode={isUserEnrolled ? 'verification' : 'enrollment'}
            onVerified={handleFaceVerified}
            onClose={() => {
              console.log('❌ [FaceRecognition] Face verification cancelled')
              setShowFaceVerification(false)
              setPendingSubmissionData(null)
              handleClose() // Close everything when face verification is cancelled
            }}
          />
        </>
      )
    }
    
    // For tasks requiring text submission
    if (task.uploadRequirement === '记录') {
      return (
        <>
          <TextInputDialog
            open={open && !showFaceVerification}
            taskName={task.title}
            taskId={task.id}
            samples={task.samples}
            onClose={() => {
              if (!showFaceVerification) {
                handleClose()
              }
            }}
            onSubmit={(textInput) => handleTaskSubmit({ textInput, type: 'text' })}
          />
          {/* Face Verification Dialog */}
          <FaceVerificationDialog
            open={showFaceVerification}
            userId={currentUser?.id || 'unknown-user'}
            userName={currentUser?.name || currentUser?.display_name || 'Unknown User'}
            taskTitle={task.title}
            mode={isUserEnrolled ? 'verification' : 'enrollment'}
            onVerified={handleFaceVerified}
            onClose={() => {
              console.log('❌ [FaceRecognition] Face verification cancelled')
              setShowFaceVerification(false)
              setPendingSubmissionData(null)
              handleClose() // Close everything when face verification is cancelled
            }}
          />
        </>
      )
    }
    
    // For tasks requiring list/checklist submission
    if (task.uploadRequirement === '列表') {
      return (
        <>
          <ListSubmissionDialog
            open={open && !showFaceVerification}
            taskName={task.title}
            sampleDir={getSampleDir(task)}
            samples={task.samples}
            onClose={() => {
              if (!showFaceVerification) {
                handleClose()
              }
            }}
            onSubmit={(data) => handleTaskSubmit({ items: data.items, type: 'list' })}
          />
          {/* Face Verification Dialog */}
          <FaceVerificationDialog
            open={showFaceVerification}
            userId={currentUser?.id || 'unknown-user'}
            userName={currentUser?.name || currentUser?.display_name || 'Unknown User'}
            taskTitle={task.title}
            mode={isUserEnrolled ? 'verification' : 'enrollment'}
            onVerified={handleFaceVerified}
            onClose={() => {
              console.log('❌ [FaceRecognition] Face verification cancelled')
              setShowFaceVerification(false)
              setPendingSubmissionData(null)
              handleClose() // Close everything when face verification is cancelled
            }}
          />
        </>
      )
    }
    
    // For tasks with no specific requirements
    return (
      <>
        <Dialog open={open && !showFaceVerification} onClose={handleClose} maxWidth="sm" fullWidth>
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
        {/* Face Verification Dialog */}
        <FaceVerificationDialog
          open={showFaceVerification}
          userId={currentUser?.id || 'unknown-user'}
          userName={currentUser?.name || 'Unknown User'}
          taskTitle={task.title}
          mode={isUserEnrolled ? 'verification' : 'enrollment'}
          onVerified={handleFaceVerified}
          onClose={() => {
            setShowFaceVerification(false)
            setPendingSubmissionData(null)
          }}
        />
      </>
    )
  }
  
  return null
}