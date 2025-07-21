// Fixed version of PhotoSubmissionDialog with improved memory management
// Changes made:
// 1. Photo descriptions are now optional (can be empty)
// 2. Unlimited photo uploads are supported (no restrictions on count)
// 3. Fixed camera blank issue by:
//    - Properly cleaning up resources between captures
//    - Adding delay before restarting camera
//    - Reducing image quality to save memory
//    - Clearing canvas after each capture
//    - Adding error recovery mechanism
// 4. Unlimited sample images support with horizontal scrolling for >3 images
// 5. Updated folder mapping to use Chinese folder names

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Grid,
  Paper,
  Chip,
  Alert,
  Snackbar,
  Modal,
  Backdrop
} from '@mui/material'
import {
  Close as CloseIcon,
  CameraAlt,
  Check,
  Refresh,
  CloudUpload,
  Visibility
} from '@mui/icons-material'
import { loadTaskSample, loadFullSampleContent } from '../../utils/sampleLoader'

interface Evidence {
  photo: string
  description: string
  sampleIndex: number
}

interface Sample {
  images: string[]  // Changed from single image to array of images
  text: string
}

interface PhotoSubmissionDialogProps {
  open: boolean
  taskName: string
  taskId: string
  isFloatingTask?: boolean
  onClose: () => void
  onSubmit: (evidence: Evidence[]) => void
}

export const PhotoSubmissionDialog: React.FC<PhotoSubmissionDialogProps> = ({
  open,
  taskName,
  taskId,
  isFloatingTask = false,
  onClose,
  onSubmit
}) => {
  console.log('PhotoSubmissionDialog props:', { taskName, taskId, isFloatingTask })
  const [showOverview, setShowOverview] = useState(true)
  const [capturedEvidence, setCapturedEvidence] = useState<Evidence[]>([])
  const [currentPhoto, setCurrentPhoto] = useState('')
  const [currentDescription, setCurrentDescription] = useState('')
  const [isCapturing, setIsCapturing] = useState(true)
  const [samples, setSamples] = useState<Sample[]>([])
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0)
  const [cameraError, setCameraError] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Convert task name to sample directory (using Chinese folder names)
  const getSampleDir = (name: string): string => {
    // Handle floating tasks specially
    if (isFloatingTask) {
      return `后厨特殊任务/${name}`
    }
    
    const cleanName = name.replace(' - 拍照', '').replace(' - 录音', '')
    
    // Extract role prefix if exists (e.g., "前厅" or "后厨")
    const roleMatch = cleanName.match(/^(前厅|后厨)\s*-\s*/)
    let role = roleMatch ? roleMatch[1] : '前厅' // Default to 前厅
    const taskName = roleMatch ? cleanName.replace(roleMatch[0], '') : cleanName
    
    // Check if this is a chef-specific task even without prefix
    const chefTasks = ['食品安全检查', '开始巡店验收', '巡店验收', '食材下单', '损耗称重']
    if (!roleMatch && chefTasks.includes(taskName)) {
      role = '后厨'
    }
    
    // Map task names to new folder structure with period prefix
    const taskFolderMap: { [key: string]: { [key: string]: string } } = {
      '前厅': {
        '开店准备与设备检查': '1-开店-开店准备与设备检查',
        '召开晨会': '1-开店-召开晨会',
        '卫生准备': '2-餐前准备午市-卫生准备',
        '食品安全检查': '2-餐前准备午市-食品安全检查',
        '物资配准备': '2-餐前准备午市-物资配准备',
        '开市巡店验收': '2-餐前准备午市-开市巡店验收',
        '开市寻店验收 - 卫生': '2 - 开市寻店验收 - 卫生',
        '开市寻店验收 - 物资准备': '2 - 开市寻店验收 - 物资准备',
        '收市清洁检查': '4-餐后收市午市-收市清洁检查',
        '收市准备': '7-预打烊晚市-收市准备',
        '当日复盘总结': '8-闭店-当日复盘总结',
        '能源安全检查': '8-闭店-能源安全棂查',
        '安防闭店检查': '8-闭店-安防闭店检查',
        '营业数据记录': '8-闭店-营业数据记录'
      },
      '后厨': {
        '收货验货': '2-餐前准备午市-收货验货',
        '食品安全检查': '2-餐前准备午市-食品安全检查',
        '开始巡店验收': '2-餐前准备午市-开始巡店验收',
        '巡店验收': '2-餐前准备午市-开始巡店验收', // Both names map to same folder
        '收市清洁检查': '4-餐后收市午市-收市清洁检查',
        '收市准备': '7-预打烊晚市-收市准备',
        '损耗称重': '7-预打烊晚市-损耗称重'
      }
    }
    
    // Look up the new folder name
    const newFolderName = taskFolderMap[role]?.[taskName]
    if (newFolderName) {
      return `${role}/${newFolderName}`
    }
    
    // Fallback to original format if not found in map
    console.warn(`Task "${taskName}" not found in folder map, using original name`)
    return `${role}/${taskName}`
  }

  // Load samples
  useEffect(() => {
    console.log('=== SAMPLE LOADING EFFECT TRIGGERED ===')
    console.log('open:', open, 'taskName:', taskName, 'taskId:', taskId)
    
    if (open && taskName) {
      const loadedSamples: Sample[] = []
      console.log('=== SAMPLE LOADING DEBUG ===')
      console.log('Task Name:', taskName)
      console.log('Task ID:', taskId)
      console.log('Is Floating Task:', isFloatingTask)
      
      // First try to get the sample directory from sampleLoader mapping
      if (taskId) {
        loadFullSampleContent(taskId).then(content => {
          console.log('Sample content from sampleLoader:', content)
        }).catch(err => {
          console.error('Error loading from sampleLoader:', err)
        })
      }
      
      // For now, still use the old method for loading images
      const sampleDir = getSampleDir(taskName)
      console.log('Sample Directory:', sampleDir)
      console.log('Full Path:', `/task-samples/${sampleDir}/`)
      
      // Test with a direct fetch to verify the path
      fetch('/task-samples/前厅/4-餐后收市午市-收市清洁检查/sample1.txt')
        .then(res => {
          console.log('Direct fetch test - status:', res.status, 'ok:', res.ok)
          return res.text()
        })
        .then(text => {
          console.log('Direct fetch test - content:', text)
          // If direct fetch works, manually add a sample for testing
          if (text && !text.includes('<!doctype html>')) {
            console.log('Direct fetch successful, manually adding sample for testing')
            setSamples([{
              text: text.trim(),
              images: ['/task-samples/前厅/4-餐后收市午市-收市清洁检查/sample1.jpg']
            }])
          }
        })
        .catch(err => {
          console.error('Direct fetch test - error:', err)
        })
      
      // Dynamically check for samples (no limit)
      const checkSamples = async () => {
        let sampleIndex = 1
        let foundSamples = true
        
        while (foundSamples) {
          const sample: Sample = { images: [], text: '' }
          let hasContent = false
          
          // Try to load text file first to check if sample exists
          try {
            const textPath = `/task-samples/${sampleDir}/sample${sampleIndex}.txt`
            console.log('Trying to load text:', textPath)
            const textResponse = await fetch(textPath)
            const contentType = textResponse.headers.get('content-type')
            console.log('Text response:', textResponse.ok, 'content-type:', contentType)
            if (textResponse.ok) {
              const textContent = await textResponse.text()
              console.log('Text content loaded:', textContent.substring(0, 50) + '...')
              // Check if it's HTML (error page) or actual text content
              if (!textContent.includes('<!doctype html>') && !textContent.includes('<html')) {
                sample.text = textContent.trim()
                hasContent = true
                console.log('Sample text accepted:', sample.text)
              } else {
                console.log('Text content was HTML, skipping')
              }
            } else {
              console.log('Text response not ok:', textResponse.status)
            }
          } catch (err) {
            console.error('Error loading text:', err)
          }
          
          // Try to load images for this sample (unlimited images)
          let imgIdx = 1
          let foundImage = true
          while (foundImage) {
            try {
              // Try both naming patterns: sample1.jpg and sample1-1.jpg
              let imagePath = ''
              if (imgIdx === 1) {
                // First try sample1.jpg format
                const path1 = `/task-samples/${sampleDir}/sample${sampleIndex}.jpg`
                console.log('Trying image:', path1)
                const response = await fetch(path1)
                if (response.ok && response.headers.get('content-type')?.includes('image')) {
                  imagePath = path1
                } else {
                  // Then try sample1-1.jpg format
                  const path2 = `/task-samples/${sampleDir}/sample${sampleIndex}-1.jpg`
                  console.log('Trying image:', path2)
                  const response2 = await fetch(path2)
                  if (response2.ok && response2.headers.get('content-type')?.includes('image')) {
                    imagePath = path2
                    console.log('Found image at:', path2)
                  }
                }
              } else {
                // For additional images, use sample1-2.jpg, sample1-3.jpg format
                const path = `/task-samples/${sampleDir}/sample${sampleIndex}-${imgIdx}.jpg`
                const response = await fetch(path)
                if (response.ok && response.headers.get('content-type')?.includes('image')) {
                  imagePath = path
                }
              }
              
              if (imagePath) {
                sample.images.push(imagePath)
                hasContent = true
                console.log(`Added image ${imgIdx} to sample ${sampleIndex}`)
              } else {
                foundImage = false
              }
            } catch (err) {
              console.log(`No image found for sample${sampleIndex}-${imgIdx}.jpg`)
              foundImage = false
            }
            
            imgIdx++ // Always increment to avoid infinite loop
            
            // Safety limit to prevent infinite loops
            if (imgIdx > 50) {
              foundImage = false
            }
          }
          
          // If this sample has content, add it and check next
          if (hasContent) {
            loadedSamples.push(sample)
            sampleIndex++
          } else {
            // No more samples found
            foundSamples = false
          }
          
          // Safety limit to prevent infinite loops
          if (sampleIndex > 20) {
            break
          }
        }
        
        console.log('=== SAMPLES LOADED ===')
        console.log('Total samples:', loadedSamples.length)
        loadedSamples.forEach((sample, idx) => {
          console.log(`Sample ${idx + 1}:`, {
            hasText: !!sample.text,
            textContent: sample.text,
            imageCount: sample.images.length,
            images: sample.images
          })
        })
        setSamples(loadedSamples)
      }
      
      checkSamples().catch(err => {
        console.error('Error in checkSamples:', err)
      })
    } else {
      console.log('Conditions not met for loading samples')
    }
  }, [open, taskName, taskId])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startCamera = useCallback(async () => {
    try {
      setCameraError(false)
      
      // Ensure previous stream is stopped
      stopCamera()
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280, max: 1920 }, // Limit max resolution
          height: { ideal: 720, max: 1080 }
        } 
      })
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            console.error('Failed to play video:', e)
            setCameraError(true)
          })
        }
      }
    } catch (error) {
      console.error('Failed to start camera:', error)
      setCameraError(true)
    }
  }, [])

  // Start camera when dialog opens - with improved cleanup
  useEffect(() => {
    if (open && !showOverview && isCapturing && !currentPhoto) {
      // Add delay to ensure previous resources are cleaned up
      const timer = setTimeout(() => {
        startCamera()
      }, 300)
      
      return () => {
        clearTimeout(timer)
        stopCamera()
      }
    }
    
    // Clean up when dialog closes
    if (!open) {
      stopCamera()
      // Clear any pending timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
      }
    }
  }, [open, showOverview, isCapturing, currentPhoto, startCamera])

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      // Set canvas size based on video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Clear canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Draw image
        ctx.drawImage(video, 0, 0)
        
        // Convert to JPEG with reduced quality to save memory
        const photoData = canvas.toDataURL('image/jpeg', 0.6)
        setCurrentPhoto(photoData)
        setIsCapturing(false)
        
        // Stop camera to free resources
        stopCamera()
        
        // Clear canvas to free memory
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  const retakePhoto = () => {
    // Clear current photo to free memory
    setCurrentPhoto('')
    setCurrentDescription('')
    setIsCapturing(true)
    
    // Small delay before restarting camera
    cleanupTimeoutRef.current = setTimeout(() => {
      startCamera()
    }, 200)
  }

  const saveCurrentEvidence = () => {
    if (currentPhoto) {
      setCapturedEvidence([...capturedEvidence, {
        photo: currentPhoto,
        description: currentDescription, // Can be empty string
        sampleIndex: currentSampleIndex
      }])
      
      // Clear current photo to free memory
      setCurrentPhoto('')
      setCurrentDescription('')
      setIsCapturing(true)
      
      // Move to next sample if available
      if (currentSampleIndex < samples.length - 1) {
        setCurrentSampleIndex(currentSampleIndex + 1)
      }
      
      // Show success message
      setShowSuccess(true)
      
      // Restart camera with delay
      cleanupTimeoutRef.current = setTimeout(() => {
        startCamera()
      }, 300)
    }
  }

  const handleSubmit = () => {
    onSubmit(capturedEvidence)
    
    // Clean up all resources
    stopCamera()
    
    // Reset state
    setCapturedEvidence([])
    setCurrentPhoto('')
    setCurrentDescription('')
    setCurrentSampleIndex(0)
    setShowOverview(false)
    setCameraError(false)
  }

  const handleClose = () => {
    // Clean up all resources
    stopCamera()
    
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
    }
    
    // Reset samples
    setSamples([])
    setShowOverview(true)
    
    onClose()
  }

  const deleteEvidence = (index: number) => {
    const newEvidence = capturedEvidence.filter((_, i) => i !== index)
    setCapturedEvidence(newEvidence)
  }

  const retryCamera = () => {
    setCameraError(false)
    startCamera()
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{taskName}</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {showOverview ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              拍照要求 Photo Requirements
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {console.log('Rendering samples:', samples.length, samples)}
              {samples.length === 0 && (
                <Grid size={12}>
                  <Typography color="text.secondary">No samples loaded yet...</Typography>
                </Grid>
              )}
              {samples.map((sample, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={index}>
                  <Paper sx={{ p: 2, minHeight: 320, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      示例 {index + 1} Sample {index + 1}
                    </Typography>
                    <Box sx={{ flex: 1, mb: 1, display: 'flex', alignItems: 'center' }}>
                      {sample.images.length > 0 ? (
                        sample.images.length <= 3 ? (
                          // Responsive grid layout for 1-3 images
                          <Grid container spacing={1} sx={{ width: '100%' }}>
                            {sample.images.map((img, imgIdx) => {
                              // Calculate grid size based on total number of images
                              let gridSize = 12; // default full width
                              let imageHeight = 200; // default height
                              
                              switch (sample.images.length) {
                                case 1:
                                  gridSize = 12;
                                  imageHeight = 220;
                                  break;
                                case 2:
                                  gridSize = 6;
                                  imageHeight = 180;
                                  break;
                                case 3:
                                  gridSize = 4;
                                  imageHeight = 140;
                                  break;
                              }
                              
                              return (
                                <Grid size={gridSize} key={imgIdx}>
                                  <Box
                                    component="img"
                                    src={img}
                                    alt={`Sample ${index + 1}-${imgIdx + 1}`}
                                    onClick={() => setEnlargedImage(img)}
                                    sx={{
                                      width: '100%',
                                      height: imageHeight,
                                      objectFit: 'cover',
                                      borderRadius: 1,
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s',
                                      '&:hover': {
                                        transform: 'scale(1.03)'
                                      }
                                    }}
                                    onError={(e: any) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </Grid>
                              );
                            })}
                          </Grid>
                        ) : (
                          // Horizontal scrollable layout for more than 3 images
                          <Box
                            sx={{
                              display: 'flex',
                              overflowX: 'auto',
                              gap: 1,
                              width: '100%',
                              pb: 1,
                              '&::-webkit-scrollbar': {
                                height: '8px',
                              },
                              '&::-webkit-scrollbar-track': {
                                backgroundColor: 'rgba(0,0,0,0.1)',
                                borderRadius: '4px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                borderRadius: '4px',
                                '&:hover': {
                                  backgroundColor: 'rgba(0,0,0,0.5)',
                                },
                              },
                            }}
                          >
                            {sample.images.map((img, imgIdx) => (
                              <Box
                                key={imgIdx}
                                component="img"
                                src={img}
                                alt={`Sample ${index + 1}-${imgIdx + 1}`}
                                onClick={() => setEnlargedImage(img)}
                                sx={{
                                  minWidth: '30%',
                                  width: '30%',
                                  height: 140,
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s',
                                  '&:hover': {
                                    transform: 'scale(1.03)'
                                  }
                                }}
                                onError={(e: any) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ))}
                          </Box>
                        )
                      ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: 200,
                          backgroundColor: 'grey.200',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <Typography color="text.secondary">
                          图片示例 Image Sample
                        </Typography>
                      </Box>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto' }}>
                      {sample.text || '示例说明 Sample description'}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Box display="flex" justifyContent="center">
              <Button
                variant="contained"
                size="large"
                startIcon={<CameraAlt />}
                onClick={() => setShowOverview(false)}
              >
                开始拍照 Start Taking Photos
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Camera/Preview Area */}
            <Paper sx={{ flex: 1, position: 'relative', overflow: 'hidden', mb: 2 }}>
              {cameraError ? (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 3
                  }}
                >
                  <Alert severity="error" sx={{ mb: 2 }}>
                    相机启动失败，请检查权限设置
                    <br />
                    Camera failed to start, please check permissions
                  </Alert>
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={retryCamera}
                  >
                    重试 Retry
                  </Button>
                </Box>
              ) : isCapturing ? (
                <Box sx={{ position: 'relative', height: '100%' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />
                </Box>
              ) : (
                <Box
                  component="img"
                  src={currentPhoto}
                  alt="Captured"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              )}
            </Paper>

            {/* Controls */}
            <Box>
              {samples[currentSampleIndex] && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    参考示例 {currentSampleIndex + 1}: {samples[currentSampleIndex].text}
                  </Typography>
                </Alert>
              )}

              {!isCapturing && (
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  variant="outlined"
                  label="照片说明（可选）Photo Description (Optional)"
                  value={currentDescription}
                  onChange={(e) => setCurrentDescription(e.target.value)}
                  sx={{ mb: 2 }}
                />
              )}

              <Box display="flex" gap={2} justifyContent="center">
                {isCapturing ? (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={capturePhoto}
                    startIcon={<CameraAlt />}
                    disabled={cameraError}
                  >
                    拍照 Capture
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      onClick={retakePhoto}
                      startIcon={<Refresh />}
                    >
                      重拍 Retake
                    </Button>
                    <Button
                      variant="contained"
                      onClick={saveCurrentEvidence}
                      startIcon={<Check />}
                    >
                      保存并继续 Save & Continue
                    </Button>
                  </>
                )}
              </Box>

              {/* Captured Evidence Summary */}
              {capturedEvidence.length > 0 && (
                <Box mt={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    已拍摄 Captured: {capturedEvidence.length} 张照片
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {capturedEvidence.map((_, index) => (
                      <Chip
                        key={index}
                        label={`照片 ${index + 1}`}
                        onDelete={() => deleteEvidence(index)}
                        icon={<Visibility />}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          取消 Cancel
        </Button>
        {!showOverview && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={capturedEvidence.length === 0}
            startIcon={<CloudUpload />}
          >
            提交 ({capturedEvidence.length}) Submit ({capturedEvidence.length})
          </Button>
        )}
      </DialogActions>

      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        message="照片已保存 Photo saved"
      />

      {/* Image Enlargement Modal */}
      <Modal
        open={!!enlargedImage}
        onClose={() => setEnlargedImage(null)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)'
          }
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '90vw',
            maxHeight: '90vh',
            outline: 'none'
          }}
          onClick={() => setEnlargedImage(null)}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged image view"
        >
          <IconButton
            sx={{
              position: 'absolute',
              top: -40,
              right: -40,
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)'
              }
            }}
            onClick={() => setEnlargedImage(null)}
          >
            <CloseIcon />
          </IconButton>
          <Box
            component="img"
            src={enlargedImage || ''}
            alt="Enlarged sample"
            sx={{
              maxWidth: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 1,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
            }}
          />
        </Box>
      </Modal>
    </Dialog>
  )
}