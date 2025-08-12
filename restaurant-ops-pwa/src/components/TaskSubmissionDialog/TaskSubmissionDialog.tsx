// Universal task submission dialog that adapts to different task types
// Supports photo, audio, text, list/checklist, and no-requirement submissions
// Changes made:
// 1. Removed camera mode selection - now using unified PhotoSubmissionDialog
// 2. All photo tasks use the new three-layer interface structure
// 3. Added support for list/checklist tasks with ListSubmissionDialog
// 4. Temporarily disabled face recognition verification - testing phase
// 5. Tasks now submit directly without face verification requirement
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
import StructuredInputDialog from '../StructuredInputDialog'
// Face verification imports - kept for future use when testing phase is complete
// import { FaceVerificationDialogFree } from '../FaceVerification/FaceVerificationDialogFree'
import { authService } from '../../services/authService'
// import { faceRecognitionService } from '../../services/faceRecognitionService'
import { inventoryService } from '../../services/inventoryService'
import type { TaskTemplate } from '../../types/task.types'

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
  const [dynamicStructuredFields, setDynamicStructuredFields] = useState<any>(null)
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  // Face verification states - disabled during testing phase
  // const [showFaceVerification, setShowFaceVerification] = useState(false)
  // const [pendingSubmissionData, setPendingSubmissionData] = useState<any>(null)
  // const [isUserEnrolled, setIsUserEnrolled] = useState(false)
  
  // Debug: Track component lifecycle
  useEffect(() => {
    return () => {
    }
  }, [])
  
  // Load dynamic structured fields for 收货验货 tasks
  useEffect(() => {
    const loadDynamicFields = async () => {
      if (open && task) {
        
        // Check if task needs dynamic fields
        const needsDynamicFields = task.title.includes('收货验货') || 
          (task.structuredFields?.dynamic === true)
        
        if (needsDynamicFields) {
          setIsLoadingFields(true)
          try {
            const user = authService.getCurrentUser()
            const department = user?.role === 'chef' ? '后厨' : '前厅'
            const fields = await inventoryService.generateStructuredFields(department as '前厅' | '后厨')
            
            // Always set enabled: true for 收货验货
            setDynamicStructuredFields({
              ...fields,
              enabled: true
            })
          } catch (error) {
            console.error('[TaskSubmissionDialog] Failed to load dynamic fields:', error)
            // Still show structured fields even on error
            setDynamicStructuredFields({
              enabled: true,
              fields: []
            })
          } finally {
            setIsLoadingFields(false)
          }
        } else if (task.structuredFields?.enabled) {
          // Use existing structured fields if they're enabled but not dynamic
          setDynamicStructuredFields(task.structuredFields)
        }
      }
    }
    
    loadDynamicFields()
  }, [open, task?.id, task?.title, task?.structuredFields])
  
  // Face enrollment check - disabled during testing phase
  // useEffect(() => {
  //   if (open && task) {
  //     console.log('🔍 [FaceRecognition] TaskSubmissionDialog opened, checking enrollment...')
  //     console.log('📋 [FaceRecognition] Task details:', {
  //       id: task.id,
  //       title: task.title,
  //       uploadRequirement: task.uploadRequirement,
  //       isFloating: task.isFloating
  //     })
  //     checkUserEnrollment()
  //   }
  // }, [open, task?.id])
  
  // Early return if no task - MUST be after all hooks
  if (!task) return null
  
  // Face enrollment check function - disabled during testing phase
  // const checkUserEnrollment = async () => {
  //   const user = authService.getCurrentUser()
  //   console.log('👤 [FaceRecognition] Current user:', user)
  //   if (user) {
  //     try {
  //       const enrolled = await faceRecognitionService.hasUserEnrolled(user.id)
  //       console.log(`✅ [FaceRecognition] User enrollment status: ${enrolled ? 'ENROLLED' : 'NOT ENROLLED'}`)
  //       setIsUserEnrolled(enrolled)
  //     } catch (error) {
  //       console.error('❌ [FaceRecognition] Failed to check enrollment:', error)
  //     }
  //   } else {
  //     console.warn('⚠️ [FaceRecognition] No user logged in!')
  //   }
  // }
  
  const steps = isLateSubmission ? ['补交说明', '提交任务'] : ['提交任务']
  
  const handleExplanationConfirm = () => {
    if (isLateSubmission && step === 0) {
      setStep(1)
      setShowSubmissionDialog(true)
    }
  }
  
  const handleTaskSubmit = (data: any) => {
    console.log('🚀 Task submitted, bypassing face verification during testing phase...')
    // Skip face verification during testing phase - directly submit the task
    const submissionData = isLateSubmission 
      ? { ...data, lateExplanation: explanation }
      : data
    
    // Directly submit without face verification
    onSubmit(task.id, submissionData)
    handleClose()
  }
  
  // Face verification handler - disabled during testing phase
  // const handleFaceVerified = (verificationData: any) => {
  //   console.log('✅ [FaceRecognition] Face verified successfully!', verificationData)
  //   // Face verification passed, submit the task with original data
  //   // No need to add verification fields - user_id already indicates who submitted
  //   onSubmit(task.id, pendingSubmissionData)
  //   handleClose()
  // }
  
  const handleClose = () => {
    setStep(0)
    setExplanation('')
    setShowSubmissionDialog(false)
    // setShowFaceVerification(false)
    // setPendingSubmissionData(null)
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
  

  // Face verification debug logging - disabled during testing phase
  // const currentUser = authService.getCurrentUser()
  // useEffect(() => {
  //   console.log('🔍 [FaceRecognition] State changed - showFaceVerification:', showFaceVerification)
  //   if (showFaceVerification) {
  //     console.log('🔍 [FaceRecognition] Debug - currentUser:', currentUser)
  //     console.log('🔍 [FaceRecognition] Should render FaceVerificationDialog now!')
  //     if (!currentUser) {
  //       console.error('❌ [FaceRecognition] ERROR: currentUser is null - Face verification dialog will not show!')
  //     }
  //   }
  // }, [showFaceVerification])

  // Show appropriate submission dialog based on task requirements
  if (showSubmissionDialog || !isLateSubmission) {
    // Special case: 交割损耗称重 needs both structured fields AND photo
    if (task.title === '交割损耗称重' && task.structuredFields?.enabled) {
      return (
        <>
          <StructuredInputDialog
            open={open}
            taskName={task.title}
            taskId={task.id}
            structuredFields={task.structuredFields}
            isFloatingTask={task.isFloating}
            requiresPhoto={true}  // This task needs photo
            onClose={handleClose}
            onSubmit={(data) => {
              handleTaskSubmit(data)
            }}
          />
        </>
      )
    }
    
    // Check if task has structured fields and is not a photo task
    if (task.structuredFields?.enabled && task.uploadRequirement !== '拍照') {
      return (
        <>
          <StructuredInputDialog
            open={open}
            taskName={task.title}
            taskId={task.id}
            structuredFields={task.structuredFields}
            isFloatingTask={task.isFloating}
            onClose={handleClose}
            onSubmit={(data) => {
              handleTaskSubmit(data)
            }}
          />
        </>
      )
    }
    
    // For tasks requiring photo submission
    if (task.uploadRequirement === '拍照') {
      // Use dynamic fields if available, otherwise use task's structured fields
      const fieldsToUse = dynamicStructuredFields || task.structuredFields
        
      return (
        <>
          <PhotoSubmissionDialog
            open={open}
            taskName={task.title}
            taskId={task.id}
            initialPhotoGroups={initialPhotoGroups} // 传递初始照片组
            samples={task.samples}
            structuredFields={fieldsToUse} // 使用动态字段或原有配置
            onClose={handleClose}
            onSubmit={(data) => {
              handleTaskSubmit({ ...data, type: 'photo' })
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
            open={open}
            taskName={task.title}
            taskId={task.id}
            samples={task.samples}
            onClose={handleClose}
            onSubmit={(transcription, audioBlob) => 
              handleTaskSubmit({ transcription, audioBlob, type: 'audio' })
            }
          />
        </>
      )
    }
    
    // For tasks requiring text submission
    if (task.uploadRequirement === '记录') {
      return (
        <>
          <TextInputDialog
            open={open}
            taskName={task.title}
            taskId={task.id}
            samples={task.samples}
            onClose={handleClose}
            onSubmit={(textInput) => handleTaskSubmit({ textInput, type: 'text' })}
          />
        </>
      )
    }
    
    // For tasks requiring list/checklist submission
    if (task.uploadRequirement === '列表') {
      return (
        <>
          <ListSubmissionDialog
            open={open}
            taskName={task.title}
            sampleDir={getSampleDir(task)}
            samples={task.samples}
            onClose={handleClose}
            onSubmit={(data) => handleTaskSubmit({ items: data.items, type: 'list' })}
          />
        </>
      )
    }
    
    // For tasks with no specific requirements
    return (
      <>
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
      </>
    )
  }
  
  return null
}