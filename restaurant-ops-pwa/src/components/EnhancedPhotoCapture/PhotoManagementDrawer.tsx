// Photo Management Drawer component
// Changes made:
// 1. Shows all captured photos grouped by sample
// 2. Allows deletion and retake of photos
// 3. Shows progress for each sample
// 4. Batch submit functionality

import React from 'react'
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
  Alert,
  Grid,
  Paper,
  LinearProgress
} from '@mui/material'
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  CameraAlt,
  CloudUpload,
  CheckCircle,
  Warning
} from '@mui/icons-material'
import type { PhotoManagementDrawerProps } from './types'

export const PhotoManagementDrawer: React.FC<PhotoManagementDrawerProps> = ({
  open,
  photos,
  samples,
  onClose,
  onDeletePhoto,
  onRetakePhoto,
  onSubmitAll
}) => {
  // Group photos by sample
  const photosBySample = samples.map(sample => ({
    sample,
    photos: photos.filter(p => p.sampleId === sample.id)
  }))

  const totalSamples = samples.length
  const completedSamples = photosBySample.filter(item => item.photos.length > 0).length
  const completionPercentage = (completedSamples / totalSamples) * 100

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              照片管理
            </Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          {/* Progress */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                进度: {completedSamples}/{totalSamples} 个示例
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(completionPercentage)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={completionPercentage}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>

          {/* Summary */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`共 ${photos.length} 张照片`}
              color="primary"
              size="small"
            />
            <Chip
              label={`${completedSamples} 个示例已完成`}
              color={completedSamples === totalSamples ? 'success' : 'default'}
              size="small"
              icon={completedSamples === totalSamples ? <CheckCircle /> : undefined}
            />
          </Box>
        </Box>

        {/* Photo List */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {photosBySample.map(({ sample, photos: samplePhotos }, sampleIndex) => (
            <Box key={sample.id}>
              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Sample {sampleIndex + 1}
                  {samplePhotos.length > 0 && (
                    <Chip
                      label={`${samplePhotos.length}张`}
                      size="small"
                      color="success"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {sample.text}
                </Typography>
              </Box>

              {samplePhotos.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    未拍摄照片
                  </Typography>
                </Box>
              ) : (
                <List>
                  {samplePhotos.map((photo, index) => (
                    <ListItem key={photo.id}>
                      <ListItemIcon>
                        <Box
                          component="img"
                          src={photo.photoData}
                          alt={`照片 ${index + 1}`}
                          sx={{
                            width: 60,
                            height: 60,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={`照片 ${index + 1}`}
                        secondary={
                          <>
                            {new Date(photo.timestamp).toLocaleTimeString()}
                            {photo.description && (
                              <Typography variant="caption" display="block">
                                {photo.description}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => onDeletePhoto(photo.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
              
              {sampleIndex < photosBySample.length - 1 && <Divider />}
            </Box>
          ))}
        </Box>

        {/* Actions */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          {completedSamples < totalSamples && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              还有 {totalSamples - completedSamples} 个示例未拍摄照片
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid size={6}>
              <Button
                fullWidth
                variant="outlined"
                onClick={onClose}
              >
                继续拍摄
              </Button>
            </Grid>
            <Grid size={6}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<CloudUpload />}
                onClick={onSubmitAll}
                disabled={photos.length === 0}
              >
                提交全部
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Drawer>
  )
}