// Hero section showing current workflow period
import { Box, Typography, Paper, Chip } from '@mui/material'
import { getBusinessStatus } from '../../utils/workflowParser'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import StorefrontIcon from '@mui/icons-material/Storefront'
import NightsStayIcon from '@mui/icons-material/NightsStay'

interface PeriodHeroProps {
  testTime?: Date | null
}

export const PeriodHero: React.FC<PeriodHeroProps> = ({ testTime }) => {
  const businessStatus = getBusinessStatus(testTime || undefined)
  
  const getStatusColor = () => {
    switch (businessStatus.status) {
      case 'closed':
        return '#9e9e9e' // grey
      case 'opening':
        return '#2196f3' // blue
      case 'operating':
        return '#4caf50' // green
      case 'closing':
        return '#ff9800' // orange
      default:
        return '#757575'
    }
  }

  const getStatusIcon = () => {
    switch (businessStatus.status) {
      case 'closed':
        return <NightsStayIcon />
      case 'opening':
      case 'closing':
        return <StorefrontIcon />
      case 'operating':
        return <RestaurantIcon />
      default:
        return <AccessTimeIcon />
    }
  }

  const getBackgroundGradient = () => {
    const color = getStatusColor()
    return `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        background: getBackgroundGradient(),
        borderLeft: `4px solid ${getStatusColor()}`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          opacity: 0.05,
          transform: 'rotate(-15deg)'
        }}
      >
        {React.cloneElement(getStatusIcon(), { sx: { fontSize: 200 } })}
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: getStatusColor(),
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {getStatusIcon()}
          </Box>
          
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: getStatusColor() }}>
              {businessStatus.message}
            </Typography>
            {businessStatus.period && (
              <Typography variant="body2" color="text.secondary">
                {businessStatus.period.startTime} - {businessStatus.period.endTime}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Next period info */}
        {businessStatus.nextPeriod && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              下一阶段 Next:
            </Typography>
            <Chip
              size="small"
              icon={<AccessTimeIcon />}
              label={`${businessStatus.nextPeriod.displayName} (${businessStatus.nextPeriod.startTime})`}
              sx={{ backgroundColor: 'white' }}
            />
          </Box>
        )}

        {/* Status indicators */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {businessStatus.status === 'operating' && businessStatus.period && (
            <>
              <Chip
                size="small"
                label={`前厅: ${businessStatus.period.tasks.manager.length} 项任务`}
                color="primary"
                variant="outlined"
              />
              <Chip
                size="small"
                label={`后厨: ${businessStatus.period.tasks.chef.length} 项任务`}
                color="secondary"
                variant="outlined"
              />
            </>
          )}
          {businessStatus.status === 'closed' && (
            <Chip
              size="small"
              label="非营业时间 Non-business hours"
              variant="outlined"
            />
          )}
        </Box>
      </Box>
    </Paper>
  )
}

// React.cloneElement polyfill removed - not needed with proper React import