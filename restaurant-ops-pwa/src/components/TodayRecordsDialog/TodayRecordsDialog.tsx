// 今日上传记录查看对话框
// 显示浮动任务的所有今日提交记录
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  ImageList,
  ImageListItem,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import {
  Close,
  History,
  Photo,
  ExpandMore,
  LocalShipping
} from '@mui/icons-material'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { supabase } from '../../services/supabase'
import { authService } from '../../services/authService'

interface TodayRecordsDialogProps {
  open: boolean
  taskIds: string[] // 浮动任务的ID列表
  onClose: () => void
}

interface SubmissionRecord {
  id: string
  task_id: string
  task_title: string
  created_at: string
  text_content?: string
  photo_urls?: string[]
  submission_metadata?: any
  status: string
}

export const TodayRecordsDialog: React.FC<TodayRecordsDialogProps> = ({
  open,
  taskIds,
  onClose
}) => {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<SubmissionRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      // 关闭时清空数据
      setRecords([])
      setError(null)
      return
    }
    
    if (taskIds.length > 0) {
      fetchTodayRecords()
    }
  }, [open, taskIds.join(',')]) // 使用字符串来避免数组引用变化

  const fetchTodayRecords = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        setError('用户未登录')
        return
      }

      // 获取今天的日期范围
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 查询今日的浮动任务记录
      const { data, error: fetchError } = await supabase
        .from('roleplay_task_records')
        .select(`
          id,
          task_id,
          created_at,
          text_content,
          photo_urls,
          submission_metadata,
          status,
          roleplay_tasks!inner(title)
        `)
        .in('task_id', taskIds)
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Failed to fetch records:', fetchError)
        setError('获取记录失败')
        return
      }

      // 格式化数据
      const formattedRecords = (data || []).map(record => ({
        id: record.id,
        task_id: record.task_id,
        task_title: (record.roleplay_tasks as any)?.title || '未知任务',
        created_at: record.created_at,
        text_content: record.text_content,
        photo_urls: record.photo_urls,
        submission_metadata: record.submission_metadata,
        status: record.status
      }))

      setRecords(formattedRecords)
    } catch (err) {
      console.error('Error fetching records:', err)
      setError('获取记录时出错')
    } finally {
      setLoading(false)
    }
  }


  // 按任务分组记录
  const groupedRecords = records.reduce((acc, record) => {
    if (!acc[record.task_title]) {
      acc[record.task_title] = []
    }
    acc[record.task_title].push(record)
    return acc
  }, {} as Record<string, SubmissionRecord[]>)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <History color="primary" />
            <Typography variant="h6">今日上传记录</Typography>
            <Chip 
              size="small" 
              label={format(new Date(), 'yyyy年MM月dd日', { locale: zhCN })}
              color="default"
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : records.length === 0 ? (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center"
            minHeight={200}
            gap={2}
          >
            <LocalShipping sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography color="text.secondary">
              今日暂无上传记录
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* 按任务分组显示记录 */}
            {Object.entries(groupedRecords).map(([taskTitle, taskRecords]) => (
              <Box key={taskTitle}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                  {taskTitle} ({taskRecords.length}次)
                </Typography>
                
                {taskRecords.map((record, index) => {
                  const structuredData = record.submission_metadata?.structured_data
                  return (
                    <Accordion 
                      key={record.id}
                      sx={{ 
                        mb: 1,
                        '&:before': { display: 'none' },
                        boxShadow: 1
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        sx={{ 
                          '& .MuiAccordionSummary-content': {
                            alignItems: 'center',
                            gap: 2
                          }
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(record.created_at), 'HH:mm')}
                        </Typography>
                        
                        {structuredData && (
                          <>
                            <Typography variant="body2" fontWeight={500}>
                              {structuredData.item_name || '未知物品'}
                            </Typography>
                            <Typography variant="body2">
                              {structuredData.quantity || 0} {structuredData.unit || ''}
                            </Typography>
                          </>
                        )}
                        
                        {!structuredData && record.text_content && (
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {record.text_content.substring(0, 30)}...
                          </Typography>
                        )}
                        
                        {record.photo_urls && record.photo_urls.length > 0 && (
                          <Chip
                            size="small"
                            icon={<Photo />}
                            label={`${record.photo_urls.length}张`}
                            sx={{ ml: 'auto' }}
                          />
                        )}
                      </AccordionSummary>
                      
                      <AccordionDetails>
                        {/* 质量检查 */}
                        {structuredData?.quality_check && (
                          <Box sx={{ mb: 2 }}>
                            <Chip 
                              size="small" 
                              label={`质量: ${structuredData.quality_check}`}
                              color={structuredData.quality_check === '合格' ? 'success' : 'error'}
                              variant="outlined"
                            />
                          </Box>
                        )}
                        
                        {/* 完整文本内容 */}
                        {record.text_content && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              备注：
                            </Typography>
                            <Typography variant="body2">
                              {record.text_content}
                            </Typography>
                          </Box>
                        )}
                        
                        {/* 照片展示 */}
                        {record.photo_urls && record.photo_urls.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              上传照片：
                            </Typography>
                            <ImageList cols={3} gap={8} sx={{ mt: 1 }}>
                              {record.photo_urls.map((url, idx) => (
                                <ImageListItem key={idx}>
                                  <img
                                    src={url}
                                    alt={`照片 ${idx + 1}`}
                                    loading="lazy"
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover',
                                      borderRadius: 4,
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                </ImageListItem>
                              ))}
                            </ImageList>
                          </Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  )
                })}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  )
}

export default TodayRecordsDialog