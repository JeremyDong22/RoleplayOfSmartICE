// 完全重构的拍照提交对话框
// 实现三层界面结构：Sample列表 → 相机拍摄 → 照片组列表
// 支持数据持久化，退出后再进入仍保留拍摄记录
// 2025-01-22: 更新任务ID映射 - 添加lunch-closing-manager-2/3/4，删除lunch-duty-manager-1/2/3/4
// 2025-01-25: 使用预生成的文件列表避免404错误
// 2025-08-11: 添加iPad相机比例优化

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { loadExistingFiles } from '../../utils/silentFileCheck'
import { isIPadDevice, getOptimizedConstraints } from '../../utils/cameraHelper'
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
  Chip,
  Alert,
  Snackbar,
  Modal,
  Backdrop,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  InputAdornment
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
  Comment as CommentIcon,
  FlashOn,
  FlashOff,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon
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
  structuredData?: {
    item_name?: string
    quantity?: number
    unit?: string
    unit_price?: number
    total_price?: number
    quality_check?: string
    [key: string]: any
  }  // 结构化数据
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
  samples?: {
    samples: Array<{
      index: number
      text: string
      images: string[]
    }>
  } | null  // 新的samples数据结构
  structuredFields?: any  // 结构化字段配置
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
  samples,
  structuredFields,
  onClose,
  onSubmit
}) => {
  // console.log('[PhotoDialog] Opening with:', { taskName, taskId, isFloatingTask })
  
  // 视图控制
  const [currentView, setCurrentView] = useState<ViewType>('samples')
  
  // Sample数据
  const [sampleList, setSampleList] = useState<Sample[]>([])
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0)
  
  // 拍摄相关
  const [currentSessionPhotos, setCurrentSessionPhotos] = useState<Photo[]>([])
  // const [isCapturing, setIsCapturing] = useState(true)
  const [cameraError, setCameraError] = useState(false)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [flashSupported, setFlashSupported] = useState(false)
  
  // 已保存的照片组
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([])
  const [currentComment, setCurrentComment] = useState('')
  
  // UI状态
  const [showSuccess, setShowSuccess] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  
  // 结构化数据状态
  const [structuredData, setStructuredData] = useState<Record<string, any>>({})
  const [selectedItemName, setSelectedItemName] = useState('')
  
  // 价格相关状态
  const [unitPrice, setUnitPrice] = useState<number | null>(null)
  const [totalPrice, setTotalPrice] = useState<number | null>(null)
  const [priceCalculationTimer, setPriceCalculationTimer] = useState<NodeJS.Timeout | null>(null)
  const [priceInputMode, setPriceInputMode] = useState<'none' | 'unit' | 'total'>('none')
  
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
        // 转换外部传入的照片组格式（string[] -> Photo[]）
        const convertedGroups = initialPhotoGroups.map(group => ({
          id: group.id || `group-${Date.now()}-${Math.random()}`,
          photos: (group.photos || []).map((photoUrl, index) => ({
            id: `photo-${Date.now()}-${index}`,
            image: photoUrl,
            timestamp: Date.now()
          })),
          sampleRef: group.sampleRef,
          sampleIndex: group.sampleIndex,
          comment: group.comment || '',
          createdAt: Date.now()
        }))
        
        setPhotoGroups(convertedGroups)
        console.log(`[PhotoDialog] Using ${initialPhotoGroups.length} initial photo groups from rejected submission`)
        console.log('[PhotoDialog] Initial photo groups detail:', initialPhotoGroups)
        console.log('[PhotoDialog] Converted photo groups:', convertedGroups)
        initialPhotoGroups.forEach((group, index) => {
          console.log(`[PhotoDialog] Group ${index + 1}:`, {
            id: group.id,
            photosCount: group.photos?.length || 0,
            photos: group.photos,
            firstPhotoUrl: group.photos?.[0]?.substring(0, 100) + '...'
          })
        })
      } else {
        // 否则从localStorage加载之前保存的照片组
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            const groups = JSON.parse(saved)
            setPhotoGroups(groups)
            // console.log(`[PhotoDialog] Loaded ${groups.length} saved photo groups`)
          }
        } catch {
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
      } catch {
        // console.error('[PhotoDialog] Error saving photos:', err)
      }
    }
  }, [photoGroups, taskId, STORAGE_KEY])
  
  // 加载samples
  useEffect(() => {
    if (open && taskId) {
      // 使用数据库中的样例数据
      if (samples?.samples && samples.samples.length > 0) {
        // 直接使用新的samples结构
        const loadedSamples: Sample[] = samples.samples.map(s => ({
          images: s.images || [],
          text: s.text || ''
        }))
        setSampleList(loadedSamples)
      } else {
        // 如果没有样例数据，使用本地文件作为后备
        const sampleDir = getSampleDir()
        
        const loadSamples = async () => {
          const loadedSamples: Sample[] = []
          let sampleIndex = 1
          let consecutiveEmpty = 0
          
          while (sampleIndex <= 3 && consecutiveEmpty < 2) { // 最多检查3个samples，连续2个空的就停止
            const files = await loadExistingFiles(sampleDir, sampleIndex)
            
            if (files.textFile || files.imageFiles.length > 0) {
              consecutiveEmpty = 0
              const sample: Sample = { images: files.imageFiles, text: '' }
              
              // 加载文本内容
              if (files.textFile) {
                try {
                  const textResponse = await fetch(files.textFile)
                  const textContent = await textResponse.text()
                  if (!textContent.includes('<!doctype html>')) {
                    sample.text = textContent.trim()
                  }
                } catch {
                  // 静默处理
                }
              }
              
              loadedSamples.push(sample)
          } else {
            consecutiveEmpty++
          }
          
          sampleIndex++
        }
        
        // console.log(`[PhotoDialog] Loaded ${loadedSamples.length} samples`)
        setSampleList(loadedSamples)
      }
      
      loadSamples()
      }
    }
  }, [open, taskId, samples])
  
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
      
      // 使用优化的约束条件（特别是对iPad）
      const constraints = await getOptimizedConstraints()
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {
            // console.error('Failed to play video:', e)
            setCameraError(true)
          })
        }
        
        // 检查是否支持闪光灯
        const track = stream.getVideoTracks()[0]
        const capabilities = track.getCapabilities ? track.getCapabilities() : {}
        if (capabilities.torch) {
          // 设备支持闪光灯
          setFlashSupported(true)
          track.applyConstraints({
            advanced: [{ torch: flashEnabled }]
          })
        } else {
          setFlashSupported(false)
        }
      }
    } catch (error) {
      // console.error('Failed to start camera:', error)
      setCameraError(true)
    }
  }, [flashEnabled])
  
  // 切换闪光灯
  const toggleFlash = useCallback(() => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0]
      const capabilities = track.getCapabilities ? track.getCapabilities() : {}
      if (capabilities.torch) {
        const newFlashState = !flashEnabled
        setFlashEnabled(newFlashState)
        track.applyConstraints({
          advanced: [{ torch: newFlashState }]
        })
      }
    }
  }, [flashEnabled])
  
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
      // 验证结构化数据（如果启用）
      if (structuredFields?.enabled) {
        const requiredFields = structuredFields.fields.filter((f: any) => f.required && f.type !== 'auto')
        for (const field of requiredFields) {
          if (!structuredData[field.key]) {
            alert(`请填写${field.label}`)
            return
          }
        }
      }
      
      // 确保价格信息被包含在结构化数据中
      const finalStructuredData = { ...structuredData }
      if (unitPrice !== null) {
        finalStructuredData.unit_price = unitPrice
      }
      if (totalPrice !== null) {
        finalStructuredData.total_price = totalPrice
      }
      
      const newGroup: PhotoGroup = {
        id: Date.now().toString(),
        photos: currentSessionPhotos,
        sampleRef: sampleList[selectedSampleIndex]?.text,
        sampleIndex: selectedSampleIndex,
        comment: currentComment,
        structuredData: structuredFields?.enabled ? finalStructuredData : undefined,
        createdAt: Date.now()
      }
      
      setPhotoGroups([...photoGroups, newGroup])
      setCurrentSessionPhotos([])
      setCurrentComment('')
      setStructuredData({})
      setUnitPrice(null)
      setTotalPrice(null)
      setPriceInputMode('none')
      if (priceCalculationTimer) {
        clearTimeout(priceCalculationTimer)
        setPriceCalculationTimer(null)
      }
      setSaveDialogOpen(false)
      setCurrentView('photos')
      stopCamera()
    }
  }
  
  // 打开保存对话框时
  const openSaveDialog = () => {
    // 如果有结构化字段，不自动填充sample text
    // 只在非结构化任务时才自动填充
    if (!currentComment && sampleList[selectedSampleIndex]?.text && !structuredFields?.enabled) {
      setCurrentComment(sampleList[selectedSampleIndex].text)
    }
    setSaveDialogOpen(true)
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
    
    // 准备提交数据
    const submitData: any = {
      evidence, // 兼容旧格式
      photoGroups: photoGroups.map(group => ({
        id: group.id,
        photos: group.photos.map(p => p.image),
        sampleRef: group.sampleRef,
        sampleIndex: group.sampleIndex,
        comment: group.comment
      }))
    }
    
    // 如果有结构化数据，添加到提交数据中
    if (structuredFields?.enabled && photoGroups.length > 0) {
      // 获取最后一个照片组的结构化数据（通常只有一个）
      const lastGroup = photoGroups[photoGroups.length - 1]
      if (lastGroup.structuredData) {
        submitData.structured_data = lastGroup.structuredData
      }
    }
    
    onSubmit(submitData)
    
    // 提交后直接清理并关闭，不要返回到samples视图
    const cleanup = () => {
      stopCamera()
      // 提交成功后清空localStorage
      if (taskId) {
        localStorage.removeItem(STORAGE_KEY)
      }
      
      setPhotoGroups([])
      setCurrentSessionPhotos([])
      setStructuredData({})
      setCurrentView('samples')
    }
    
    cleanup()
    // Don't automatically close - let parent handle it for face verification
    // onClose()
  }
  
  // 处理单价输入
  const handleUnitPriceChange = (value: string) => {
    console.log('[PhotoSubmissionDialog] 单价输入:', value)
    const price = parseFloat(value) || 0
    
    // 如果输入为空，重置状态
    if (!value || price <= 0) {
      setUnitPrice(null)
      setTotalPrice(null)
      setPriceInputMode('none')
      if (priceCalculationTimer) {
        clearTimeout(priceCalculationTimer)
        setPriceCalculationTimer(null)
      }
      return
    }
    
    // 设置单价输入模式
    setPriceInputMode('unit')
    setUnitPrice(price)
    
    // 清除之前的定时器
    if (priceCalculationTimer) {
      clearTimeout(priceCalculationTimer)
    }
    
    // 延迟2秒计算总价
    const currentQuantity = structuredData.quantity || 0
    console.log('[PhotoSubmissionDialog] 准备计算，数量:', currentQuantity)
    
    if (currentQuantity > 0) {
      const timer = setTimeout(() => {
        const total = price * currentQuantity
        console.log(`[PhotoSubmissionDialog] 计算总价: ${price} × ${currentQuantity} = ${total}`)
        setTotalPrice(Number(total.toFixed(2)))
      }, 2000)
      setPriceCalculationTimer(timer)
    }
  }
  
  // 处理总价输入
  const handleTotalPriceChange = (value: string) => {
    console.log('[PhotoSubmissionDialog] 总价输入:', value)
    const total = parseFloat(value) || 0
    
    // 如果输入为空，重置状态
    if (!value || total <= 0) {
      setUnitPrice(null)
      setTotalPrice(null)
      setPriceInputMode('none')
      if (priceCalculationTimer) {
        clearTimeout(priceCalculationTimer)
        setPriceCalculationTimer(null)
      }
      return
    }
    
    // 设置总价输入模式
    setPriceInputMode('total')
    setTotalPrice(total)
    
    // 清除之前的定时器
    if (priceCalculationTimer) {
      clearTimeout(priceCalculationTimer)
    }
    
    // 延迟2秒计算单价
    const currentQuantity = structuredData.quantity || 0
    console.log('[PhotoSubmissionDialog] 准备计算，数量:', currentQuantity)
    
    if (currentQuantity > 0) {
      const timer = setTimeout(() => {
        const unit = total / currentQuantity
        console.log(`[PhotoSubmissionDialog] 计算单价: ${total} ÷ ${currentQuantity} = ${unit}`)
        setUnitPrice(Number(unit.toFixed(2)))
      }, 2000)
      setPriceCalculationTimer(timer)
    }
  }
  
  const handleClose = () => {
    stopCamera()
    setSampleList([])
    setCurrentView('samples')
    setFlashEnabled(false)
    setUnitPrice(null)
    setTotalPrice(null)
    setPriceInputMode('none')
    if (priceCalculationTimer) {
      clearTimeout(priceCalculationTimer)
      setPriceCalculationTimer(null)
    }
    onClose()
  }
  
  // 渲染Sample列表界面
  const renderSampleList = () => (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        拍照示例
      </Typography>
      
      {photoGroups.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          已保存 {photoGroups.length} 组照片，共 {photoGroups.reduce((sum, g) => sum + g.photos.length, 0)} 张
        </Alert>
      )}
      
      <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
        <Grid container spacing={2}>
          {sampleList.length === 0 ? (
            <Grid size={12}>
              <Alert severity="info">
                <Typography>正在加载示例...</Typography>
              </Alert>
            </Grid>
          ) : (
            sampleList.map((sample, index) => (
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
                          alt={`示例图片 ${imgIdx + 1}`}
                          crossOrigin="anonymous"
                          onClick={() => setEnlargedImage(img)}
                          onError={(e) => {
                            console.error('[PhotoSubmission] Image failed to load:', img)
                            // Don't hide the image, show a placeholder instead
                            const target = e.target as HTMLImageElement
                            // Try to use a fallback image or keep showing broken image icon
                            if (!target.src.includes('placeholder')) {
                              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E图片加载失败%3C/text%3E%3C/svg%3E'
                            }
                          }}
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
                            backgroundColor: '#f5f5f5', // Add background color for loading state
                            '&:hover': {
                              borderColor: 'primary.main'
                            }
                          }}
                        />
                      ))}
                    </Box>
                  )}
                  
                  {/* 示例描述 */}
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre-line' }}
                  >
                    {sample.text}
                  </Typography>
                </Paper>
              </Grid>
            ))
          )}
        </Grid>
      </Box>
      
      {/* 底部按钮 - 固定在底部 */}
      <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CameraAlt />}
          onClick={() => setCurrentView('camera')}
          disabled={sampleList.length === 0}
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 顶部工具栏 - 固定高度 */}
      <Box sx={{ 
        p: 1.5, 
        borderBottom: 1, 
        borderColor: 'divider',
        flexShrink: 0
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Button
            size="small"
            startIcon={<ArrowBack />}
            onClick={() => {
              if (currentSessionPhotos.length > 0) {
                openSaveDialog()
              } else {
                setCurrentView('samples')
              }
            }}
          >
            返回
          </Button>
          
          <Box display="flex" alignItems="center" gap={1}>
            {flashSupported && (
              <IconButton
                onClick={toggleFlash}
                size="small"
                sx={{ 
                  color: flashEnabled ? 'warning.main' : 'text.secondary',
                  bgcolor: flashEnabled ? 'action.hover' : 'transparent'
                }}
              >
                {flashEnabled ? <FlashOn /> : <FlashOff />}
              </IconButton>
            )}
            <Typography variant="subtitle2">
              本次已拍: {currentSessionPhotos.length} 张
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* 相机视图 - 动态比例 */}
      <Box sx={{ 
        width: '100%',
        flex: 1,  // 占用剩余空间
        position: 'relative', 
        bgcolor: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
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
                objectFit: isIPadDevice() ? 'contain' : 'cover',
                backgroundColor: '#000'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
          </>
        )}
      </Box>
      
      {/* 底部控制区 - 固定高度，防止遮挡 */}
      <Box sx={{ 
        p: 1.5, 
        borderTop: 1, 
        borderColor: 'divider',
        flexShrink: 0,
        maxHeight: '35%',  // 减少最大高度
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Sample选择器 */}
        <FormControl size="small" fullWidth sx={{ mb: 1 }}>
          <InputLabel>选择参考示例</InputLabel>
          <Select
            value={selectedSampleIndex}
            onChange={(e) => {
              setSelectedSampleIndex(Number(e.target.value))
              // 切换样例时清空之前的备注
              setCurrentComment('')
            }}
            label="选择参考示例"
          >
            {sampleList.map((sample, index) => (
              <MenuItem key={index} value={index}>
                示例 {index + 1}: {sample.text.substring(0, 25)}...
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* 当前sample预览 - 更紧凑布局 */}
        {sampleList[selectedSampleIndex] && sampleList[selectedSampleIndex].images.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              参考图片
            </Typography>
            <Box 
              sx={{ 
                display: 'flex', 
                gap: 0.5, 
                mt: 0.3,
                overflowX: 'auto',
                overflowY: 'hidden',
                '&::-webkit-scrollbar': { height: '4px' },
                '&::-webkit-scrollbar-track': { 
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  borderRadius: '2px'
                },
                '&::-webkit-scrollbar-thumb': { 
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '2px'
                }
              }}
            >
              {sampleList[selectedSampleIndex].images.slice(0, 3).map((img, idx) => (
                <Box
                  key={idx}
                  component="img"
                  src={img}
                  alt={`Ref ${idx + 1}`}
                  onClick={() => setEnlargedImage(img)}
                  sx={{
                    height: 40,
                    minWidth: 40,
                    objectFit: 'cover',
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
        
        {/* 拍照按钮 - 保持在中间 */}
        <Box display="flex" gap={1} justifyContent="center" sx={{ mb: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={capturePhoto}
            startIcon={<CameraAlt />}
            disabled={cameraError}
          >
            拍照
          </Button>
          
          {currentSessionPhotos.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => openSaveDialog()}
            >
              保存 ({currentSessionPhotos.length})
            </Button>
          )}
        </Box>
        
        {/* 已拍照片预览 - 固定高度，使用横向滚动 */}
        {currentSessionPhotos.length > 0 && (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            flex: 1
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mb: 0.3 }}>
              本次拍摄 ({currentSessionPhotos.length} 张)
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              overflowX: 'auto',
              overflowY: 'hidden',
              pb: 0.5,
              '&::-webkit-scrollbar': { height: '4px' },
              '&::-webkit-scrollbar-track': { 
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '2px'
              },
              '&::-webkit-scrollbar-thumb': { 
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '2px'
              }
            }}>
              {currentSessionPhotos.map((photo) => (
                <Box key={photo.id} sx={{ position: 'relative', flexShrink: 0 }}>
                  <Box
                    component="img"
                    src={photo.image}
                    alt="Captured"
                    onClick={() => setEnlargedImage(photo.image)}
                    sx={{
                      width: 45,
                      height: 45,
                      objectFit: 'cover',
                      borderRadius: 0.5,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: 'background.paper',
                      width: 18,
                      height: 18,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'error.light' },
                      '& .MuiSvgIcon-root': { fontSize: 10 }
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSessionPhoto(photo.id)
                    }}
                  >
                    <Delete />
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
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
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
      
      <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
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
                      <Typography 
                        variant="subtitle2"
                        sx={{ whiteSpace: 'pre-line' }}
                      >
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
                  
                  {/* 结构化数据显示 */}
                  {group.structuredData && (
                    <Box sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        收货信息
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                        {group.structuredData.item_name && (
                          <>物品名称: {group.structuredData.item_name}<br /></>
                        )}
                        {group.structuredData.quantity && (
                          <>数量: {group.structuredData.quantity} {group.structuredData.unit || ''}<br /></>
                        )}
                        {group.structuredData.unit_price && (
                          <>单价: ¥{group.structuredData.unit_price}<br /></>
                        )}
                        {group.structuredData.total_price && (
                          <>总价: ¥{group.structuredData.total_price}<br /></>
                        )}
                        {group.structuredData.quality_check && (
                          <>质量检查: {group.structuredData.quality_check}</>
                        )}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* 评论 */}
                  {group.comment && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <CommentIcon fontSize="small" color="action" sx={{ mt: 0.5 }} />
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ whiteSpace: 'pre-line' }}
                      >
                        {group.comment}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
      
      {/* 底部按钮 - 固定在底部 */}
      <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2, justifyContent: 'center' }}>
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

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        <DialogTitle>
          {structuredFields?.enabled ? (
            <Box display="flex" alignItems="center" gap={1}>
              <InventoryIcon color="primary" />
              <Typography variant="h6">填写收货信息</Typography>
            </Box>
          ) : (
            '保存这组照片'
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              共 {currentSessionPhotos.length} 张照片
            </Typography>
            {sampleList[selectedSampleIndex]?.text && !structuredFields?.enabled && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ whiteSpace: 'pre-line', display: 'block' }}
              >
                检查项: {sampleList[selectedSampleIndex].text}
              </Typography>
            )}
          </Box>
          
          {/* 结构化输入区域 */}
          {structuredFields?.enabled && structuredFields?.fields ? (
            <Box sx={{ mb: 2 }}>
              <Divider sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  库存信息
                </Typography>
              </Divider>
              
              {structuredFields.fields.map((field: any) => {
                // 跳过价格字段，稍后单独渲染
                if (field.key === 'unit_price' || field.key === 'total_price') {
                  return null
                }
                
                if (field.type === 'select') {
                  return (
                    <FormControl fullWidth sx={{ mb: 2 }} key={field.key}>
                      <InputLabel required={field.required}>
                        {field.label}
                      </InputLabel>
                      <Select
                        value={structuredData[field.key] || ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setStructuredData({
                            ...structuredData,
                            [field.key]: value
                          })
                          // 如果选择了物品，自动填充单位
                          if (field.key === 'item_name') {
                            const unitField = structuredFields.fields.find(
                              (f: any) => f.key === 'unit'
                            )
                            if (unitField?.mapping && unitField.mapping[value]) {
                              setStructuredData({
                                ...structuredData,
                                [field.key]: value,
                                unit: unitField.mapping[value]
                              })
                            }
                          }
                        }}
                        label={field.label}
                      >
                        {field.options?.map((option: string) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )
                } else if (field.type === 'number') {
                  return (
                    <TextField
                      key={field.key}
                      fullWidth
                      type="number"
                      label={field.label}
                      required={field.required}
                      value={structuredData[field.key] || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        setStructuredData({
                          ...structuredData,
                          [field.key]: value
                        })
                        
                        // 如果修改了数量，重新计算价格
                        if (field.key === 'quantity') {
                          const quantity = parseFloat(value) || 0
                          if (unitPrice !== null && quantity > 0) {
                            const newTotal = unitPrice * quantity
                            setTotalPrice(Number(newTotal.toFixed(2)))
                            console.log(`[PhotoSubmissionDialog] 数量变化，重新计算总价: ${unitPrice} × ${quantity} = ${newTotal.toFixed(2)}`)
                          } else if (totalPrice !== null && quantity > 0) {
                            const newUnit = totalPrice / quantity
                            setUnitPrice(Number(newUnit.toFixed(2)))
                            console.log(`[PhotoSubmissionDialog] 数量变化，重新计算单价: ${totalPrice} ÷ ${quantity} = ${newUnit.toFixed(2)}`)
                          }
                        }
                      }}
                      inputProps={{
                        min: field.min || 0,
                        step: field.decimal ? 0.01 : 1
                      }}
                      sx={{ mb: 2 }}
                    />
                  )
                } else if (field.type === 'auto') {
                  return (
                    <TextField
                      key={field.key}
                      fullWidth
                      label={field.label}
                      value={structuredData[field.key] || ''}
                      disabled
                      sx={{ mb: 2 }}
                    />
                  )
                }
                return null
              })}
              
              {/* 价格输入区域 */}
              {(taskName.includes('收货') || taskName.includes('验货')) && (
                <>
                  <Divider sx={{ my: 2 }}>
                    <Chip 
                      icon={<MoneyIcon />} 
                      label="价格信息" 
                      size="small"
                      color="primary"
                    />
                  </Divider>
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="单价"
                      value={unitPrice !== null ? unitPrice : ''}
                      onChange={(e) => {
                        console.log('[PhotoSubmissionDialog] 单价onChange触发, value:', e.target.value)
                        handleUnitPriceChange(e.target.value)
                      }}
                      disabled={priceInputMode === 'total'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                        endAdornment: structuredData.unit && (
                          <InputAdornment position="end">/{structuredData.unit}</InputAdornment>
                        )
                      }}
                      inputProps={{
                        min: 0,
                        step: 0.01
                      }}
                      helperText={
                        priceInputMode === 'total' ? '根据总价自动计算' :
                        priceInputMode === 'unit' ? '正在输入单价...' :
                        '输入后2秒自动计算总价'
                      }
                    />
                    
                    <TextField
                      fullWidth
                      type="number"
                      label="总价"
                      value={totalPrice !== null ? totalPrice : ''}
                      onChange={(e) => {
                        console.log('[PhotoSubmissionDialog] 总价onChange触发, value:', e.target.value)
                        handleTotalPriceChange(e.target.value)
                      }}
                      disabled={priceInputMode === 'unit'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">¥</InputAdornment>
                      }}
                      inputProps={{
                        min: 0,
                        step: 0.01
                      }}
                      helperText={
                        priceInputMode === 'unit' ? '根据单价自动计算' :
                        priceInputMode === 'total' ? '正在输入总价...' :
                        '输入后2秒自动计算单价'
                      }
                    />
                  </Box>
                  
                  {(unitPrice !== null || totalPrice !== null) && structuredData.quantity && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {unitPrice && totalPrice && (
                        <>价格信息：¥{unitPrice}/{structuredData.unit || '单位'} × {structuredData.quantity} = ¥{totalPrice}</>
                      )}
                    </Alert>
                  )}
                </>
              )}
              
              <Divider sx={{ my: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  备注信息
                </Typography>
              </Divider>
            </Box>
          ) : null}
          
          <TextField
            fullWidth
            multiline
            rows={structuredFields?.enabled ? 2 : 4}
            label={structuredFields?.enabled ? "备注（可选）" : "照片说明"}
            value={currentComment}
            onChange={(e) => setCurrentComment(e.target.value)}
            placeholder={structuredFields?.enabled 
              ? "请输入其他需要说明的信息..." 
              : "请描述这组照片的情况..."}
            helperText={!structuredFields?.enabled 
              ? "检查项文本已预填充，您可以编辑或添加更多说明" 
              : null}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>
            返回
          </Button>
          <Button 
            variant="contained" 
            onClick={savePhotoGroup}
            disabled={structuredFields?.enabled && (!structuredData.item_name || !structuredData.quantity)}
          >
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