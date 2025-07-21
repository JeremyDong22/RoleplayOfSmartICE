// AudioRecordingDialog.tsx - Component for recording audio and converting to text for task evidence
import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  CircularProgress,
  TextField,
  Alert,
  Divider
} from '@mui/material'
import {
  Close as CloseIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'

interface AudioRecordingDialogProps {
  open: boolean
  taskName: string
  taskId: string
  onClose: () => void
  onSubmit: (transcription: string, audioBlob?: Blob) => void
}

export default function AudioRecordingDialog({
  open,
  taskName,
  taskId,
  onClose,
  onSubmit
}: AudioRecordingDialogProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [transcription, setTranscription] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sampleContent, setSampleContent] = useState<string>('')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)
  
  // Helper function to get sample directory path
  const getSampleDir = (name: string): string => {
    const cleanName = name.replace(' - 拍照', '').replace(' - 录音', '')
    
    // Extract role prefix if exists (e.g., "前厅" or "后厨")
    const roleMatch = cleanName.match(/^(前厅|后厨)\s*-\s*/)
    const role = roleMatch ? roleMatch[1] : '前厅' // Default to 前厅
    const taskName = roleMatch ? cleanName.replace(roleMatch[0], '') : cleanName
    
    // Map task names to new folder structure with period prefix
    const taskFolderMap: { [key: string]: { [key: string]: string } } = {
      '前厅': {
        '当日复盘总结': '8-闭店-当日复盘总结'
      },
      '后厨': {
        // Add chef audio tasks here if any
      }
    }
    
    // Look up the new folder name
    const newFolderName = taskFolderMap[role]?.[taskName]
    if (newFolderName) {
      return `${role}/${newFolderName}`
    }
    
    // Fallback to original format if not found in map
    return `${role}/${taskName}`
  }

  // Load sample content when dialog opens
  useEffect(() => {
    if (open && taskName) {
      const loadSampleContent = async () => {
        try {
          const sampleDir = getSampleDir(taskName)
          const response = await fetch(`/task-samples/${sampleDir}/sample1.txt`)
          if (response.ok) {
            const text = await response.text()
            setSampleContent(text)
          } else {
            setSampleContent('')
          }
        } catch (error) {
          console.error('Failed to load sample content:', error)
          setSampleContent('')
        }
      }
      loadSampleContent()
    }
  }, [open, taskName])
  
  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'zh-CN'
      
      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }
        
        setTranscription(prev => prev + finalTranscript)
      }
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
      }
      
      recognitionRef.current = recognition
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        setAudioUrl(URL.createObjectURL(audioBlob))
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
      
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      
      setIsPaused(true)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
      
      setIsPaused(false)
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
  }

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const resetRecording = () => {
    stopRecording()
    setAudioBlob(null)
    setAudioUrl('')
    setTranscription('')
    setRecordingTime(0)
  }

  const handleSubmit = () => {
    if (transcription) {
      onSubmit(transcription, audioBlob || undefined)
      resetRecording()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{taskName} - 录音</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
          {/* Sample content hint */}
          {sampleContent && (
            <Alert severity="info" sx={{ width: '100%' }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                录音提示：
              </Typography>
              <Typography variant="body2" component="pre" sx={{ 
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                margin: 0
              }}>
                {sampleContent}
              </Typography>
            </Alert>
          )}
          
          <Divider sx={{ width: '100%' }} />
          {/* Recording status */}
          <Paper elevation={2} sx={{ p: 3, width: '100%', textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              {formatTime(recordingTime)}
            </Typography>
            
            {isRecording && !isPaused && (
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                    animation: 'pulse 1.5s infinite'
                  }}
                />
                <Typography color="error">正在录音...</Typography>
              </Box>
            )}
            
            {isPaused && (
              <Typography color="text.secondary">录音已暂停</Typography>
            )}
            
            {audioUrl && !isRecording && (
              <Typography color="success.main">录音完成</Typography>
            )}
          </Paper>
          
          {/* Control buttons */}
          <Box display="flex" gap={2}>
            {!isRecording && !audioUrl && (
              <Button
                variant="contained"
                size="large"
                startIcon={<MicIcon />}
                onClick={startRecording}
                color="error"
              >
                开始录音
              </Button>
            )}
            
            {isRecording && !isPaused && (
              <>
                <Button
                  variant="outlined"
                  onClick={pauseRecording}
                  startIcon={<PauseIcon />}
                >
                  暂停
                </Button>
                <Button
                  variant="contained"
                  onClick={stopRecording}
                  startIcon={<StopIcon />}
                  color="error"
                >
                  停止
                </Button>
              </>
            )}
            
            {isRecording && isPaused && (
              <>
                <Button
                  variant="contained"
                  onClick={resumeRecording}
                  startIcon={<PlayArrowIcon />}
                  color="primary"
                >
                  继续
                </Button>
                <Button
                  variant="outlined"
                  onClick={stopRecording}
                  startIcon={<StopIcon />}
                  color="error"
                >
                  停止
                </Button>
              </>
            )}
            
            {audioUrl && !isRecording && (
              <>
                <Button
                  variant="outlined"
                  onClick={playAudio}
                  startIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                >
                  {isPlaying ? '暂停' : '播放'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={resetRecording}
                  startIcon={<RefreshIcon />}
                  color="error"
                >
                  重录
                </Button>
              </>
            )}
          </Box>
          
          {/* Audio player (hidden) */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              style={{ display: 'none' }}
            />
          )}
          
          {/* Transcription */}
          <TextField
            fullWidth
            multiline
            rows={6}
            label="转录文本"
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="录音内容将自动转换为文字..."
            helperText="您可以手动编辑转录的文本"
          />
          
          {isTranscribing && (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={20} />
              <Typography variant="body2">正在转录...</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          startIcon={<CloudUploadIcon />}
          disabled={!transcription}
        >
          上传并完成任务
        </Button>
      </DialogActions>
      
      <style jsx global>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </Dialog>
  )
}