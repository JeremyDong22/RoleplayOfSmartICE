// Test page for floating camera view
import React, { useState } from 'react'
import { Box, Button, Typography, Container } from '@mui/material'
import { PhotoCamera } from '@mui/icons-material'
import { FloatingCameraView } from '../components/FloatingCameraView'

const TestFloatingCamera: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [submittedPhotos, setSubmittedPhotos] = useState<any[]>([])

  const handleSubmit = (evidence: any[]) => {
    console.log('Submitted evidence:', evidence)
    setSubmittedPhotos(evidence)
    setOpen(false)
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        测试悬浮窗相机 Test Floating Camera
      </Typography>
      
      <Box sx={{ my: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<PhotoCamera />}
          onClick={() => setOpen(true)}
        >
          打开悬浮窗相机 Open Floating Camera
        </Button>
      </Box>

      {submittedPhotos.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            已提交照片 Submitted Photos: {submittedPhotos.length}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {submittedPhotos.map((evidence, index) => (
              <Box
                key={index}
                component="img"
                src={evidence.photo}
                alt={`Photo ${index + 1}`}
                sx={{
                  width: 200,
                  height: 150,
                  objectFit: 'cover',
                  borderRadius: 1,
                  boxShadow: 2
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      <FloatingCameraView
        open={open}
        taskName="卫生准备 - 拍照"
        taskId="test-task"
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </Container>
  )
}

export default TestFloatingCamera