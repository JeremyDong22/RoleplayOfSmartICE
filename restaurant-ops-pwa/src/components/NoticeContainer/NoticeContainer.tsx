// Component for displaying notice tasks
// Created for lunch-service and dinner-service periods where notices replace regular tasks
// Updated: Removed comment functionality, only display notices
import React from 'react'
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  Divider,
  Chip
} from '@mui/material'
import {
  Announcement
} from '@mui/icons-material'
import type { TaskTemplate } from '../../utils/workflowParser'

interface NoticeContainerProps {
  notices: TaskTemplate[]
  isServicePeriod?: boolean // 是否为服务时段（午餐/晚餐）
}

export const NoticeContainer: React.FC<NoticeContainerProps> = ({
  notices,
  isServicePeriod = false
}) => {

  if (notices.length === 0) {
    return null
  }

  return (
    <>
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mt: 2,
          border: theme => isServicePeriod ? `2px solid ${theme.palette.info.main}` : 'none',
          backgroundColor: theme => isServicePeriod ? theme.palette.info.light + '10' : 'inherit'
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Announcement sx={{ color: 'info.main', fontSize: 28 }} />
          <Typography variant="h5" fontWeight="medium">
            {isServicePeriod ? '服务期间注意事项' : '注意事项'}
          </Typography>
          {isServicePeriod && (
            <Chip 
              label="服务时段" 
              size="small" 
              color="info"
              sx={{ ml: 'auto' }}
            />
          )}
        </Box>
        
        {isServicePeriod && (
          <Typography variant="body2" color="text.secondary" paragraph>
            以下为{notices[0]?.timeSlot?.includes('lunch') ? '午餐' : '晚餐'}服务期间的重要提醒，请在服务过程中关注并记录相关情况。
          </Typography>
        )}
        
        <List disablePadding>
          {notices.map((notice, index) => {
            return (
              <React.Fragment key={notice.id}>
                {index > 0 && <Divider sx={{ my: 2 }} />}
                <ListItem 
                  sx={{ 
                    px: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    borderRadius: 1,
                    p: 2
                  }}
                >
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography 
                        variant="subtitle1" 
                        fontWeight="medium"
                        sx={{ flex: 1 }}
                      >
                        {notice.title}
                      </Typography>
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      paragraph
                    >
                      {notice.description}
                    </Typography>
                  </Box>
                </ListItem>
              </React.Fragment>
            )
          })}
        </List>
      </Paper>
    </>
  )
}