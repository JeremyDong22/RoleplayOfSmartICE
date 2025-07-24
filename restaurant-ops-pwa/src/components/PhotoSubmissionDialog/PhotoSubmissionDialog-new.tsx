// 完全重构的拍照提交对话框
// 实现三层界面结构：Sample列表 → 相机拍摄 → 照片组列表
// 支持数据持久化，退出后再进入仍保留拍摄记录
// 2025-01-22: 更新任务ID映射 - 添加lunch-closing-manager-2/3/4，删除lunch-duty-manager-1/2/3/4

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
  Paper,
  // Chip,
  Alert,
  Snackbar,
  Modal,
  Backdrop,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  // Badge
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Close as CloseIcon,
  CameraAlt,
  // Check,
  Refresh,
  CloudUpload,
  Visibility,
  Delete,
  ArrowBack,
  // Image as ImageIcon,
  Comment as CommentIcon
} from '@mui/icons-material'

// 视图类型
type ViewType = 'samples' | 'camera' | 'photos'

// 单张照片
interface Photo {
  id: string
  image: string
  timestamp: number
}

// 照片组（一次拍摄会话）
interface PhotoGroup {
  id: string
  photos: Photo[]
  sampleRef?: string  // 参考的sample名称
  sampleIndex?: number
  comment?: string
  createdAt: number
}

// Sample定义
interface Sample {
  images: string[]
  text: string
}

interface PhotoSubmissionDialogProps {
  open: boolean
  taskName: string
  taskId: string
  isFloatingTask?: boolean
  initialPhotoGroups?: PhotoGroup[]  // 新增：支持传入之前的照片组
  onClose: () => void
  onSubmit: (evidence: Array<{
    photo: string
    description: string
    sampleIndex: number
  }>) => void
}

export const PhotoSubmissionDialog: React.FC<PhotoSubmissionDialogProps> = ({
  open,
  taskName,
  taskId,
  // isFloatingTask = false,
  initialPhotoGroups,
  onClose,
  onSubmit
}) => {
  // console.log('[PhotoDialog] Opening with:', { taskName, taskId, isFloatingTask })
  
  // 视图控制
  const [currentView, setCurrentView] = useState<ViewType>('samples')
  
  // Sample数据
  const [samples, setSamples] = useState<Sample[]>([])
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0)
  
  // 拍摄相关
  const [currentSessionPhotos, setCurrentSessionPhotos] = useState<Photo[]>([])
  // const [isCapturing, setIsCapturing] = useState(true)
  const [cameraError, setCameraError] = useState(false)
  
  // 已保存的照片组
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([])
  const [currentComment, setCurrentComment] = useState('')
  
  // UI状态
  const [showSuccess, setShowSuccess] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  // Storage key for persistence
  const STORAGE_KEY = `photo-collection-${taskId}`
  
  // 任务ID到sample文件夹的映射
  const taskSamplePathMap: Record<string, string> = {
    // 前厅任务
    'opening-manager-1': '前厅/1-开店-召开早会',
    'opening-manager-2': '前厅/1-开店-开店准备与设备检查',
    'lunch-prep-manager-1': '前厅/2 - 开市寻店验收 - 卫生',
    'lunch-prep-manager-2': '前厅/2 - 开市寻店验收 - 物资准备',
    'lunch-closing-manager-1': '前厅/4-餐后收市午市-收市清洁检查',
    'lunch-closing-manager-2': '前厅/4-餐后收市午市-营业款核对',
    'lunch-closing-manager-3': '前厅/4-餐后收市午市-能源管理',
    'lunch-closing-manager-4': '前厅/4-餐后收市午市-安排值班人员',
    'dinner-prep-manager-1': '前厅/5-餐前准备晚市-召开午会',
    'dinner-prep-manager-2': '前厅/5-餐前准备晚市-开市寻店验收 - 卫生',
    'dinner-prep-manager-3': '前厅/5-餐前准备晚市-开市寻店验收 - 物资准备',
    'pre-closing-manager-2': '前厅/7-预打烊晚市-值班安排',
    'pre-closing-manager-1': '前厅/7-预打烊晚市-收市清洁检查',
    'closing-manager-4': '前厅/8-闭店-当日复盘总结',
    
    // 后厨任务
    'opening-chef-1': '后厨/1-开店-开店准备与设备检查',
    'lunch-prep-chef-1': '后厨/2-餐前准备午市-食品安全检查',
    'lunch-prep-chef-2': '后厨/2-餐前准备午市-收货验货',
    'lunch-prep-chef-3': '后厨/2-餐前准备午市-开始巡店验收',
    'lunch-closing-chef-1': '后厨/4-餐后收市午市-收市清洁检查',
    'dinner-prep-chef-1': '后厨/5-餐前准备晚市-召开午会',
    'dinner-prep-chef-2': '后厨/2-餐前准备午市-食品安全检查',
    'dinner-prep-chef-3': '后厨/5-餐前准备晚市-食材准备',
    'dinner-prep-chef-4': '后厨/2-餐前准备午市-开始巡店验收',
    'pre-closing-chef-1': '后厨/7-预打烊晚市-食材下单',
    'pre-closing-chef-2': '后厨/7-预打烊晚市-收市清洁检查',
    'pre-closing-chef-3': '后厨/7-预打烊晚市-损耗称重',
    
    // 浮动任务
    'floating-receiving': '后厨特殊任务/收货验货',
    'floating-meat-processing': '后厨特殊任务/交割损耗称重',
    'floating-receiving-manager': '前厅特殊任务/收货验货',
    
    // 值班经理任务
    'closing-duty-manager-1': '值班经理/8-闭店-能源安全检查',
    'closing-duty-manager-2': '值班经理/8-闭店-安防闭店检查',
    'closing-duty-manager-3': '值班经理/8-闭店-营业数据记录',
  }
  
  // 获取sample目录
  const getSampleDir = () => {
    return taskSamplePathMap[taskId] || `前厅/${taskName}`
  }
  
  // 加载保存的照片组或使用传入的初始照片组
  useEffect(() => {
    if (open && taskId) {
      // 优先使用传入的初始照片组（用于重新提交被驳回的任务）
      if (initialPhotoGroups && initialPhotoGroups.length > 0) {
        setPhotoGroups(initialPhotoGroups)
        console.log(`[PhotoDialog] Using ${initialPhotoGroups.length} initial photo groups from rejected submission`)
      } else {
        // 否则从localStorage加载之前保存的照片组
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            const groups = JSON.parse(saved)
            setPhotoGroups(groups)
            // console.log(`[PhotoDialog] Loaded ${groups.length} saved photo groups`)
          }
        } catch (err) {
          // console.error('[PhotoDialog] Error loading saved photos:', err)
        }
      }
    }
  }, [open, taskId, STORAGE_KEY, initialPhotoGroups])
  
  // 保存照片组到localStorage
  useEffect(() => {
    if (taskId && photoGroups.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(photoGroups))
        // console.log('[PhotoDialog] Saved photo groups to localStorage')
      } catch (err) {
        // console.error('[PhotoDialog] Error saving photos:', err)
      }
    }
  }, [photoGroups, taskId, STORAGE_KEY])
  
  // 加载samples
  useEffect(() => {
    if (open && taskId) {
      const sampleDir = getSampleDir()
      // console.log('[PhotoDialog] Loading samples from:', sampleDir)
      
      const loadSamples = async () => {
        const loadedSamples: Sample[] = []
        let sampleIndex = 1
        
        while (sampleIndex <= 20) { // 最多检查20个samples
          const sample: Sample = { images: [], text: '' }
          let hasContent = false
          
          // 加载文本
          try {
            const textPath = `/task-samples/${sampleDir}/sample${sampleIndex}.txt`
            const textResponse = await fetch(textPath)
            if (textResponse.ok) {
              const textContent = await textResponse.text()
              if (!textContent.includes('<!doctype html>')) {
                sample.text = textContent.trim()
                hasContent = true
              }
            }
          } catch (err) {
            // 静默失败
          }
          
          // 加载图片
          let imgIdx = 1
          while (imgIdx <= 10) { // 每个sample最多10张图片
            try {
              const imagePath = `/task-samples/${sampleDir}/sample${sampleIndex}-${imgIdx}.jpg`
              const imgResponse = await fetch(imagePath)
              if (imgResponse.ok && imgResponse.headers.get('content-type')?.includes('image')) {
                sample.images.push(imagePath)
                hasContent = true
              } else {
                break
              }
            } catch (err) {
              break
            }
            imgIdx++
          }
          
          if (hasContent) {
            loadedSamples.push(sample)
          } else {
            break
          }
          
          sampleIndex++
        }
        
        // console.log(`[PhotoDialog] Loaded ${loadedSamples.length} samples`)
        setSamples(loadedSamples)
      }
      
      loadSamples()
    }
  }, [open, taskId])
  
  // 相机管理
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
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
      stopCamera()
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        } 
      })
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {
            // console.error('Failed to play video:', e)
            setCameraError(true)
          })
        }
      }
    } catch (error) {
      // console.error('Failed to start camera:', error)
      setCameraError(true)
    }
  }, [])
  
  // 启动相机（当进入相机视图时）
  useEffect(() => {
    if (open && currentView === 'camera') {
      const timer = setTimeout(() => {
        startCamera()
      }, 300)
      
      return () => {
        clearTimeout(timer)
        stopCamera()
      }
    } else {
      stopCamera()
    }
  }, [open, currentView, startCamera])
  
  // 拍照
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(video, 0, 0)
        
        const photoData = canvas.toDataURL('image/jpeg', 0.7)
        
        const newPhoto: Photo = {
          id: Date.now().toString(),
          image: photoData,
          timestamp: Date.now()
        }
        
        setCurrentSessionPhotos([...currentSessionPhotos, newPhoto])
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        setShowSuccess(true)
      }
    }
  }
  
  // 保存当前拍摄会话
  const savePhotoGroup = () => {
    if (currentSessionPhotos.length > 0) {
      const newGroup: PhotoGroup = {
        id: Date.now().toString(),
        photos: currentSessionPhotos,
        sampleRef: samples[selectedSampleIndex]?.text,
        sampleIndex: selectedSampleIndex,
        comment: currentComment,
        createdAt: Date.now()
      }
      
      setPhotoGroups([...photoGroups, newGroup])
      setCurrentSessionPhotos([])
      setCurrentComment('')
      setSaveDialogOpen(false)
      setCurrentView('photos')
      stopCamera()
    }
  }
  
  // 删除功能
  const deleteSessionPhoto = (photoId: string) => {
    setCurrentSessionPhotos(currentSessionPhotos.filter(p => p.id !== photoId))
  }
  
  const deletePhotoGroup = (groupId: string) => {
    setPhotoGroups(photoGroups.filter(g => g.id !== groupId))
  }
  
  // 最终提交
  const handleSubmit = () => {
    // 保留原有的evidence格式用于兼容
    const evidence = photoGroups.flatMap(group => 
      group.photos.map(photo => ({
        photo: photo.image,
        description: group.comment || '',
        sampleIndex: group.sampleIndex || 0
      }))
    )
    
    // 同时传递photoGroups数据
    onSubmit({
      evidence, // 兼容旧格式
      photoGroups: photoGroups.map(group => ({
        id: group.id,
        photos: group.photos.map(p => p.image),
        sampleRef: group.sampleRef,
        sampleIndex: group.sampleIndex,
        comment: group.comment
      }))
    } as any)
    
    stopCamera()
    // 提交成功后清空localStorage
    if (taskId) {
      localStorage.removeItem(STORAGE_KEY)
    }
    
    setPhotoGroups([])
    setCurrentSessionPhotos([])
    setCurrentView('samples')
  }
  
  const handleClose = () => {
    stopCamera()
    setSamples([])
    setCurrentView('samples')
    onClose()
  }
  
  // 渲染Sample列表界面
  const renderSampleList = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        拍照示例
      </Typography>
      
      {photoGroups.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          已保存 {photoGroups.length} 组照片，共 {photoGroups.reduce((sum, g) => sum + g.photos.length, 0)} 张
        </Alert>
      )}
      
      <Grid container spacing={2}>
        {samples.length === 0 ? (
          <Grid size={12}>
            <Alert severity="info">
              <Typography>正在加载示例...</Typography>
            </Alert>
          </Grid>
        ) : (
          samples.map((sample, index) => (
            <Grid size={12} key={index}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  示例 {index + 1}
                </Typography>
                
                {/* 示例图片 */}
                {sample.images.length > 0 && (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      gap: 1, 
                      mb: 2,
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      py: 1,
                      WebkitOverflowScrolling: 'touch', // 提升移动端滚动流畅度
                      '&::-webkit-scrollbar': { height: '8px' },
                      '&::-webkit-scrollbar-track': { 
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        borderRadius: '4px'
                      },
                      '&::-webkit-scrollbar-thumb': { 
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        borderRadius: '4px',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.5)'
                        }
                      }
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
                          height: 120,
                          width: 120,
                          minWidth: 120, // 确保图片不会被压缩
                          flexShrink: 0, // 防止图片缩小
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer',
                          border: '2px solid transparent',
                          transition: 'border-color 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main'
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
                
                {/* 示例描述 */}
                <Typography variant="body2" color="text.secondary">
                  {sample.text}
                </Typography>
              </Paper>
            </Grid>
          ))
        )}
      </Grid>
      
      {/* 底部按钮 */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CameraAlt />}
          onClick={() => setCurrentView('camera')}
          disabled={samples.length === 0}
        >
          开始拍摄
        </Button>
        
        {photoGroups.length > 0 && (
          <Button
            variant="outlined"
            size="large"
            startIcon={<Visibility />}
            onClick={() => setCurrentView('photos')}
          >
            已拍 ({photoGroups.length})
          </Button>
        )}
      </Box>
    </Box>
  )
  
  // 渲染相机界面
  const renderCamera = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Button
            startIcon={<ArrowBack />}
            onClick={() => {
              if (currentSessionPhotos.length > 0) {
                setSaveDialogOpen(true)
              } else {
                setCurrentView('samples')
              }
            }}
          >
            返回
          </Button>
          
          <Typography variant="subtitle1">
            本次已拍: {currentSessionPhotos.length} 张
          </Typography>
        </Box>
      </Box>
      
      {/* 相机视图 */}
      <Box sx={{ flex: 1, position: 'relative', bgcolor: 'black' }}>
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
            </Alert>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={startCamera}
            >
              重试
            </Button>
          </Box>
        ) : (
          <>
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
          </>
        )}
      </Box>
      
      {/* 底部控制区 */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        {/* Sample选择器 */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>选择参考示例</InputLabel>
          <Select
            value={selectedSampleIndex}
            onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
            label="选择参考示例"
          >
            {samples.map((sample, index) => (
              <MenuItem key={index} value={index}>
                示例 {index + 1}: {sample.text.substring(0, 30)}...
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* 当前sample预览 */}
        {samples[selectedSampleIndex] && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              参考图片 (点击放大)
            </Typography>
            <Box 
              sx={{ 
                display: 'flex', 
                gap: 1, 
                mt: 0.5,
                overflowX: 'auto',
                pb: 1
              }}
            >
              {samples[selectedSampleIndex].images.slice(0, 4).map((img, idx) => (
                <Box
                  key={idx}
                  component="img"
                  src={img}
                  alt={`Ref ${idx + 1}`}
                  onClick={() => setEnlargedImage(img)}
                  sx={{
                    height: 60,
                    minWidth: 60,
                    objectFit: 'cover',
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
        
        {/* 拍照按钮 */}
        <Box display="flex" gap={2} justifyContent="center">
          <Button
            variant="contained"
            size="large"
            onClick={capturePhoto}
            startIcon={<CameraAlt />}
            disabled={cameraError}
          >
            拍照
          </Button>
          
          {currentSessionPhotos.length > 0 && (
            <Button
              variant="outlined"
              size="large"
              onClick={() => setSaveDialogOpen(true)}
            >
              保存
            </Button>
          )}
        </Box>
        
        {/* 已拍照片预览 */}
        {currentSessionPhotos.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              本次拍摄
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              {currentSessionPhotos.map((photo) => (
                <Box key={photo.id} sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={photo.image}
                    alt="Captured"
                    sx={{
                      width: 60,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: 1
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'error.light' }
                    }}
                    onClick={() => deleteSessionPhoto(photo.id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
  
  // 渲染照片列表界面
  const renderPhotoList = () => (
    <Box sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">
          已拍摄记录
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => setCurrentView('samples')}
        >
          返回
        </Button>
      </Box>
      
      {photoGroups.length === 0 ? (
        <Alert severity="info">
          还没有拍摄任何照片
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {photoGroups.map((group, index) => (
            <Grid size={12} key={group.id}>
              <Paper sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                  <Box>
                    <Typography variant="subtitle2">
                      组 {index + 1}: {group.sampleRef || '未选择参考'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(group.createdAt).toLocaleString('zh-CN')} · {group.photos.length} 张照片
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => deletePhotoGroup(group.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Box>
                
                {/* 照片预览 */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1, overflowX: 'auto' }}>
                  {group.photos.map((photo) => (
                    <Box
                      key={photo.id}
                      component="img"
                      src={photo.image}
                      alt="Photo"
                      onClick={() => setEnlargedImage(photo.image)}
                      sx={{
                        height: 80,
                        minWidth: 80,
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </Box>
                
                {/* 评论 */}
                {group.comment && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CommentIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {group.comment}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* 底部按钮 */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          size="large"
          onClick={() => setCurrentView('camera')}
          startIcon={<CameraAlt />}
        >
          继续拍摄
        </Button>
        
        {photoGroups.length > 0 && (
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            startIcon={<CloudUpload />}
          >
            提交所有照片
          </Button>
        )}
      </Box>
    </Box>
  )
  
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

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {currentView === 'samples' && renderSampleList()}
        {currentView === 'camera' && renderCamera()}
        {currentView === 'photos' && renderPhotoList()}
      </DialogContent>

      {/* 保存对话框 */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>保存这组照片</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              共 {currentSessionPhotos.length} 张照片，参考: {samples[selectedSampleIndex]?.text || '无'}
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="添加备注（可选）"
            value={currentComment}
            onChange={(e) => setCurrentComment(e.target.value)}
            placeholder="输入这组照片的说明或备注..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>
            返回
          </Button>
          <Button variant="contained" onClick={savePhotoGroup}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 成功提示 */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        message="拍照成功"
      />
      
      {/* 图片放大查看 */}
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
            alt="Enlarged"
            sx={{
              maxWidth: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 1
            }}
          />
        </Box>
      </Modal>
    </Dialog>
  )
}