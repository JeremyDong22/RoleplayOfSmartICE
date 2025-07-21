// PhotoSubmissionDialog.tsx - Component for capturing photos and text for task evidence
// Updated: Made photo description field optional - users can now save photos without entering a description
// Updated: Confirmed no limit on number of photos that can be uploaded - users can upload unlimited photos
// Updated: Photo count is independent from example photos shown - examples are just for reference
import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Paper,
  Grid,
  Fab,
  CircularProgress
} from '@mui/material'
import {
  CameraAlt as CameraIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Replay as ReplayIcon,
  ViewList as ViewListIcon,
  CloudUpload as CloudUploadIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material'

interface PhotoEvidence {
  photo: string // base64 encoded image
  description: string
  sampleIndex: number
}

interface TaskSample {
  imagePath: string
  text: string
}

interface PhotoSubmissionDialogProps {
  open: boolean
  taskName: string
  taskId: string
  onClose: () => void
  onSubmit: (evidence: PhotoEvidence[]) => void
}

// Map task names to their sample directories
const getTaskSampleDir = (taskName: string): string => {
  if (taskName.includes('设备检查')) return 'equipment-check'
  if (taskName.includes('晨会')) return 'morning-meeting'
  if (taskName.includes('卫生准备')) return 'hygiene-prep'
  if (taskName.includes('食品安全检查')) return 'food-safety'
  if (taskName.includes('物资配准备')) return 'inventory-arrangement'
  if (taskName.includes('巡店验收')) return 'store-inspection'
  if (taskName.includes('收货验货')) return 'receipt-check'
  if (taskName.includes('能源安全检查')) return 'energy-safety'
  if (taskName.includes('收市清洁检查')) return 'hygiene-prep' // Reuse hygiene samples
  return 'food-safety' // Default fallback
}

export default function PhotoSubmissionDialog({
  open,
  taskName,
  taskId,
  onClose,
  onSubmit
}: PhotoSubmissionDialogProps) {
  const [samples, setSamples] = useState<TaskSample[]>([])
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0)
  const [capturedEvidence, setCapturedEvidence] = useState<PhotoEvidence[]>([])
  const [currentPhoto, setCurrentPhoto] = useState<string>('')
  const [currentDescription, setCurrentDescription] = useState('')
  const [showOverview, setShowOverview] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Load samples based on task name
  useEffect(() => {
    if (open) {
      const sampleDir = getTaskSampleDir(taskName)
      const loadedSamples: TaskSample[] = []
      
      // Load sample files (assuming we have at least 2 samples per task)
      for (let i = 1; i <= 2; i++) {
        loadedSamples.push({
          imagePath: `/task-samples/${sampleDir}/sample${i}.jpg`,
          text: '' // Text will be loaded dynamically
        })
      }
      
      // Load sample texts
      Promise.all(
        loadedSamples.map(async (sample, idx) => {
          try {
            const response = await fetch(`/task-samples/${sampleDir}/sample${idx + 1}.txt`)
            if (response.ok) {
              sample.text = await response.text()
            }
          } catch (error) {
            console.error('Failed to load sample text:', error)
          }
        })
      ).then(() => {
        setSamples([...loadedSamples])
      })
    }
  }, [open, taskName])

  // Start camera when dialog opens
  useEffect(() => {
    if (open && !showOverview) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [open, showOverview])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (error) {
      console.error('Failed to start camera:', error)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const photoData = canvas.toDataURL('image/jpeg', 0.8)
        setCurrentPhoto(photoData)
        setIsCapturing(false)
      }
    }
  }

  const retakePhoto = () => {
    setCurrentPhoto('')
    setIsCapturing(true)
  }

  const saveCurrentEvidence = () => {
    if (currentPhoto) {
      setCapturedEvidence([...capturedEvidence, {
        photo: currentPhoto,
        description: currentDescription, // Can be empty string
        sampleIndex: currentSampleIndex
      }])
      
      // Reset for next photo
      setCurrentPhoto('')
      setCurrentDescription('')
      setIsCapturing(true)
      
      // Move to next sample if available
      if (currentSampleIndex < samples.length - 1) {
        setCurrentSampleIndex(currentSampleIndex + 1)
      }
    }
  }

  const handleSubmit = () => {
    onSubmit(capturedEvidence)
    // Reset state
    setCapturedEvidence([])
    setCurrentPhoto('')
    setCurrentDescription('')
    setCurrentSampleIndex(0)
    setShowOverview(false)
  }

  const currentSample = samples[currentSampleIndex]

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{taskName} - 拍照上传</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {showOverview ? (
          // Overview mode
          <Box>
            <Typography variant="h6" gutterBottom>
              已拍摄照片总览
            </Typography>
            <Grid container spacing={2}>
              {capturedEvidence.map((evidence, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Box 
                      component="img" 
                      src={evidence.photo} 
                      alt={`照片 ${index + 1}`}
                      sx={{ width: '100%', height: 200, objectFit: 'cover', mb: 1 }}
                    />
                    <Typography variant="body2">{evidence.description}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Box display="flex" justifyContent="space-between" mt={3}>
              <Button
                variant="outlined"
                onClick={() => setShowOverview(false)}
                startIcon={<CameraIcon />}
              >
                继续拍摄
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                startIcon={<CloudUploadIcon />}
                disabled={capturedEvidence.length === 0}
              >
                上传并完成任务
              </Button>
            </Box>
          </Box>
        ) : (
          // Capture mode
          <Grid container spacing={3} sx={{ height: '100%' }}>
            {/* Left side - Sample */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  示例 {currentSampleIndex + 1}/{samples.length}
                </Typography>
                {currentSample && (
                  <>
                    <Box 
                      sx={{ 
                        width: '100%', 
                        height: 300, 
                        bgcolor: 'grey.200',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        position: 'relative'
                      }}
                    >
                      {/* Placeholder for sample image */}
                      <Typography variant="body2" color="text.secondary">
                        示例图片
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                      {currentSample.text}
                    </Typography>
                  </>
                )}
                
                {/* Sample navigation */}
                <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
                  <IconButton 
                    onClick={() => setCurrentSampleIndex(Math.max(0, currentSampleIndex - 1))}
                    disabled={currentSampleIndex === 0}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <Typography variant="body2" sx={{ mx: 2 }}>
                    {currentSampleIndex + 1} / {samples.length}
                  </Typography>
                  <IconButton 
                    onClick={() => setCurrentSampleIndex(Math.min(samples.length - 1, currentSampleIndex + 1))}
                    disabled={currentSampleIndex === samples.length - 1}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </Box>
              </Paper>
            </Grid>
            
            {/* Right side - Camera capture */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  拍摄
                </Typography>
                
                {/* Camera/Photo display */}
                <Box sx={{ position: 'relative', mb: 2 }}>
                  {currentPhoto ? (
                    <Box 
                      component="img" 
                      src={currentPhoto} 
                      alt="拍摄的照片"
                      sx={{ width: '100%', height: 300, objectFit: 'contain' }}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: 300, objectFit: 'cover' }}
                    />
                  )}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </Box>
                
                {/* Description input */}
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="照片描述"
                  value={currentDescription}
                  onChange={(e) => setCurrentDescription(e.target.value)}
                  placeholder={currentSample?.text || '请输入照片描述'}
                  sx={{ mb: 2 }}
                />
                
                {/* Action buttons */}
                <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  {currentPhoto ? (
                    <>
                      <Button
                        variant="outlined"
                        onClick={retakePhoto}
                        startIcon={<ReplayIcon />}
                      >
                        重拍
                      </Button>
                      <Button
                        variant="contained"
                        onClick={saveCurrentEvidence}
                      >
                        保存并继续
                      </Button>
                    </>
                  ) : (
                    <Fab
                      color="primary"
                      onClick={capturePhoto}
                      sx={{ mx: 'auto' }}
                    >
                      <PhotoCameraIcon />
                    </Fab>
                  )}
                </Box>
                
                {/* Overview button */}
                {capturedEvidence.length > 0 && (
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Button
                      variant="text"
                      onClick={() => setShowOverview(true)}
                      startIcon={<ViewListIcon />}
                    >
                      查看总览 ({capturedEvidence.length})
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  )
}