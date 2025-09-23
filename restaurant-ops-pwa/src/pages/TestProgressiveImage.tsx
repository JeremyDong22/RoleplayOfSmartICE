/**
 * Test Page for Progressive Image Loading
 * Version: 1.0
 *
 * A test page to demonstrate and verify the progressive image loading functionality
 *
 * Created: 2025-01-24
 */

import React, { useState } from 'react'
import { Container, Box, Typography, Button, Paper } from '@mui/material'
import Grid from '@mui/material/Grid'
import { ProgressiveImage } from '../components/ProgressiveImage/ProgressiveImage'

const TestProgressiveImage: React.FC = () => {
  const [showImages, setShowImages] = useState(false)

  // Test with actual Supabase Storage URLs from your bucket
  const testImages = [
    'https://wdpeoyugsxqnpwwtkqsl.supabase.co/storage/v1/object/public/RolePlay/photos/2025-01-20/sample_1.jpg',
    'https://wdpeoyugsxqnpwwtkqsl.supabase.co/storage/v1/object/public/RolePlay/photos/2025-01-20/sample_2.jpg',
    'https://wdpeoyugsxqnpwwtkqsl.supabase.co/storage/v1/object/public/RolePlay/photos/2025-01-20/sample_3.jpg',
  ]

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        渐进式图片加载测试
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          功能说明：
        </Typography>
        <Typography variant="body2" paragraph>
          1. 初始加载150x150缩略图（约10-20KB）
        </Typography>
        <Typography variant="body2" paragraph>
          2. 进入视口后加载800x800预览图（约50-100KB）
        </Typography>
        <Typography variant="body2" paragraph>
          3. 点击图片加载原图
        </Typography>
        <Typography variant="body2" paragraph>
          4. 支持懒加载，只有进入视口的图片才会开始加载
        </Typography>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={() => setShowImages(!showImages)}
        >
          {showImages ? '隐藏图片' : '显示测试图片'}
        </Button>
      </Box>

      {showImages && (
        <Grid container spacing={2}>
          {testImages.map((url, index) => (
            <Grid size={4} key={index}>
              <Paper sx={{ p: 1 }}>
                <Typography variant="caption" gutterBottom>
                  测试图片 {index + 1}
                </Typography>
                <ProgressiveImage
                  src={url}
                  alt={`Test image ${index + 1}`}
                  width="100%"
                  height={200}
                  loading="lazy"
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          网络调试提示：
        </Typography>
        <Typography variant="body2" paragraph>
          1. 打开浏览器开发者工具（F12）
        </Typography>
        <Typography variant="body2" paragraph>
          2. 切换到Network标签
        </Typography>
        <Typography variant="body2" paragraph>
          3. 观察图片请求的URL参数和大小
        </Typography>
        <Typography variant="body2" paragraph>
          4. 缩略图URL应包含：width=150&height=150&quality=40
        </Typography>
        <Typography variant="body2" paragraph>
          5. 预览图URL应包含：width=800&height=800&quality=70
        </Typography>
      </Box>
    </Container>
  )
}

export default TestProgressiveImage