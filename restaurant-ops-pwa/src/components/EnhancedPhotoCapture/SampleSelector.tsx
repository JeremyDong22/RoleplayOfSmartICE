// Sample Selector component for Enhanced Photo Capture
// Changes made:
// 1. Dropdown selector for switching between samples
// 2. Shows sample description and completion status
// 3. Expandable sample images with (i) button

import React, { useState } from 'react'
import {
  Box,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Collapse,
  Chip,
  FormControl,
  InputLabel,
  Paper
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Info as InfoIcon,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  RadioButtonUnchecked
} from '@mui/icons-material'
import type { SampleSelectorProps } from './types'

export const SampleSelector: React.FC<SampleSelectorProps> = ({
  samples,
  currentSampleId,
  onSampleChange,
  capturedPhotos
}) => {
  const [expanded, setExpanded] = useState(false)
  
  const currentSample = samples.find(s => s.id === currentSampleId)
  const photosForCurrentSample = capturedPhotos.filter(p => p.sampleId === currentSampleId)
  
  // Get completion status for each sample
  const getSampleStatus = (sampleId: string) => {
    const photos = capturedPhotos.filter(p => p.sampleId === sampleId)
    return photos.length > 0
  }

  return (
    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Sample Selector */}
        <FormControl sx={{ minWidth: 200, flex: 1 }}>
          <InputLabel id="sample-selector-label">选择示例</InputLabel>
          <Select
            labelId="sample-selector-label"
            value={currentSampleId}
            onChange={(e) => onSampleChange(e.target.value)}
            label="选择示例"
            size="small"
          >
            {samples.map((sample, index) => (
              <MenuItem key={sample.id} value={sample.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  {getSampleStatus(sample.id) ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : (
                    <RadioButtonUnchecked color="disabled" fontSize="small" />
                  )}
                  <Typography>
                    Sample {index + 1}
                    {getSampleStatus(sample.id) && (
                      <Chip 
                        label={`已拍${capturedPhotos.filter(p => p.sampleId === sample.id).length}张`}
                        size="small"
                        color="success"
                        sx={{ ml: 1, height: 20 }}
                      />
                    )}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Info Button */}
        <IconButton
          onClick={() => setExpanded(!expanded)}
          sx={{ 
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' }
          }}
        >
          <InfoIcon />
        </IconButton>
      </Box>

      {/* Sample Description */}
      {currentSample && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {currentSample.text}
          </Typography>
          
          {photosForCurrentSample.length > 0 && (
            <Chip
              label={`已为此示例拍摄 ${photosForCurrentSample.length} 张照片`}
              size="small"
              color="primary"
              sx={{ mt: 1 }}
            />
          )}
        </Box>
      )}

      {/* Expandable Sample Images */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {currentSample && currentSample.images.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              示例图片 ({currentSample.images.length}张)
            </Typography>
            <Grid container spacing={1}>
              {currentSample.images.map((image, index) => (
                <Grid size={{ xs: 4, sm: 3, md: 2 }} key={index}>
                  <Box
                    component="img"
                    src={image}
                    alt={`示例 ${index + 1}`}
                    sx={{
                      width: '100%',
                      height: 100,
                      objectFit: 'cover',
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: 2
                      }
                    }}
                    onClick={() => {
                      // TODO: Open image in modal
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Collapse>

      {/* Expand/Collapse Button */}
      {currentSample && currentSample.images.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      )}
    </Paper>
  )
}