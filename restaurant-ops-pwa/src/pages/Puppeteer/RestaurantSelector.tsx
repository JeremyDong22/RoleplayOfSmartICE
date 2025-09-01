// Restaurant Selector Component - Consistent with project UI design
// Matches the clean, professional style of CEO Dashboard and Inventory Management
// Updated: 2025-09-02 - Added loading optimization and error handling improvements

import React, { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Stack,
  IconButton,
  useTheme,
  useMediaQuery,
  Skeleton,
  Button
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { 
  Storefront as StorefrontIcon,
  LocationCity as LocationCityIcon,
  LocationOn as LocationOnIcon,
  ArrowForward as ArrowForwardIcon,
  Business as BusinessIcon,
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { Restaurant } from '../../types/sampleManager.types'
import { SampleManagerService } from '../../services/sampleManagerService'

interface RestaurantSelectorProps {
  onSelect: (restaurant: Restaurant) => void
}

// Create motion components
const MotionCard = motion.create(Card)

export const RestaurantSelector: React.FC<RestaurantSelectorProps> = ({ onSelect }) => {
  const theme = useTheme()
  const navigate = useNavigate()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  useEffect(() => {
    loadRestaurants()
  }, [])

  const loadRestaurants = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Add timeout for better UX
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('加载超时，请检查网络连接')), 15000)
      )
      
      const dataPromise = SampleManagerService.getRestaurants()
      
      const data = await Promise.race([dataPromise, timeoutPromise]) as any
      setRestaurants(data || [])
    } catch (err: any) {
      if (err.message === '加载超时，请检查网络连接') {
        setError(err.message)
      } else {
        setError('加载餐厅列表失败，请刷新页面重试')
      }
      console.error('Failed to load restaurants:', err)
    } finally {
      setLoading(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header Skeleton */}
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="text" width={300} height={24} sx={{ mt: 1 }} />
        </Box>

        {/* Cards Skeleton */}
        <Grid container spacing={3}>
          {[1, 2, 3].map((index) => (
            <Grid 
              item
              xs={12}
              sm={6}
              md={4}
              key={index}
            >
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="80%" height={28} />
                      <Skeleton variant="text" width="60%" height={20} />
                    </Box>
                  </Box>
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="90%" height={20} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={loadRestaurants}>
              重试
            </Button>
          }
          sx={{ 
            borderRadius: 2,
            '& .MuiAlert-icon': { fontSize: 28 }
          }}
        >
          {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/role-selection')}
        sx={{ 
          mb: 3,
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        返回角色选择
      </Button>
      
      {/* Header Section - Clean and Professional */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 600,
            color: 'text.primary',
            mb: 1
          }}
        >
          <StorefrontIcon fontSize="large" color="primary" />
          选择餐厅门店
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ ml: 6 }}
        >
          请选择要管理任务样本的餐厅
        </Typography>
      </Box>

      {/* Restaurant Cards Grid */}
      <Grid container spacing={isMobile ? 2 : 3}>
        <AnimatePresence>
          {restaurants.map((restaurant, index) => (
            <Grid 
              item
              xs={12}
              sm={6}
              md={4}
              key={restaurant.id}
            >
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.05,
                  ease: "easeOut"
                }}
                elevation={hoveredCard === restaurant.id ? 8 : 1}
                onMouseEnter={() => setHoveredCard(restaurant.id)}
                onMouseLeave={() => setHoveredCard(null)}
                sx={{
                  height: { xs: 260, sm: 280 }, // Responsive height
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: hoveredCard === restaurant.id 
                    ? 'primary.main' 
                    : 'divider',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': restaurant.icon ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `url(${restaurant.icon})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: 'blur(8px)',
                    opacity: 0.15,
                    transform: 'scale(1.1)',
                    transition: 'all 0.3s',
                    zIndex: 0
                  } : {},
                  '&:hover': {
                    borderColor: 'primary.main',
                    '&::before': restaurant.icon ? {
                      opacity: 0.25,
                      filter: 'blur(10px)',
                      transform: 'scale(1.15)'
                    } : {},
                    '& .restaurant-arrow': {
                      transform: 'translateX(4px)',
                      color: 'primary.main'
                    },
                    '& .restaurant-icon': {
                      color: 'primary.main',
                      transform: 'scale(1.1)'
                    }
                  }
                }}
              >
                <CardActionArea
                  onClick={() => onSelect(restaurant)}
                  sx={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'flex-start',
                    position: 'relative',
                    zIndex: 1,
                    '& .MuiCardActionArea-focusHighlight': {
                      opacity: 0.05
                    }
                  }}
                >
                  <CardContent sx={{ 
                    p: isMobile ? 2 : 3,
                    position: 'relative',
                    zIndex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Restaurant Icon and Name */}
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start',
                        mb: 2,
                        height: 80 // Fixed height for icon section
                      }}
                    >
                      <Box
                        className="restaurant-icon"
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          backgroundColor: restaurant.icon ? 'white' : 'primary.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                          transition: 'all 0.3s',
                          flexShrink: 0,
                          overflow: 'hidden',
                          boxShadow: restaurant.icon ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                          border: restaurant.icon ? '2px solid rgba(255,255,255,0.9)' : 'none'
                        }}
                      >
                        {restaurant.icon ? (
                          <img 
                            src={restaurant.icon} 
                            alt={restaurant.name}
                            loading="lazy"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              // Hide broken images
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <BusinessIcon 
                            sx={{ 
                              color: 'primary.main',
                              fontSize: 32
                            }} 
                          />
                        )}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.4,
                            height: '1.4em',
                            mb: 1
                          }}
                        >
                          {restaurant.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationCityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ fontSize: '0.875rem' }}
                          >
                            {restaurant.city || '未知城市'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Address Section */}
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start',
                        flex: 1,
                        minHeight: 60,
                        maxHeight: 60,
                        overflow: 'hidden'
                      }}
                    >
                      {restaurant.address ? (
                        <>
                          <LocationOnIcon 
                            sx={{ 
                              fontSize: 18, 
                              color: 'text.secondary',
                              mr: 1,
                              mt: 0.25,
                              flexShrink: 0
                            }} 
                          />
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              lineHeight: 1.5,
                              wordBreak: 'break-word',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontSize: '0.875rem'
                            }}
                          >
                            {restaurant.address}
                          </Typography>
                        </>
                      ) : (
                        <Typography 
                          variant="body2" 
                          color="text.disabled"
                          sx={{ 
                            fontStyle: 'italic'
                          }}
                        >
                          暂无地址信息
                        </Typography>
                      )}
                    </Box>

                    {/* Action Area */}
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pt: 2,
                        mt: 'auto', // Push to bottom
                        borderTop: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{
                          color: 'primary.main',
                          fontWeight: 500
                        }}
                      >
                        进入管理
                      </Typography>
                      <NavigateNextIcon 
                        className="restaurant-arrow"
                        sx={{ 
                          fontSize: 20,
                          color: 'text.secondary',
                          transition: 'all 0.3s'
                        }} 
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </MotionCard>
            </Grid>
          ))}
        </AnimatePresence>
      </Grid>

      {/* Empty State */}
      {restaurants.length === 0 && !loading && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 2,
            border: '2px dashed',
            borderColor: 'divider',
            backgroundColor: 'background.default'
          }}
        >
          <StorefrontIcon 
            sx={{ 
              fontSize: 64, 
              color: 'text.disabled', 
              mb: 2 
            }} 
          />
          <Typography 
            variant="h6" 
            color="text.secondary" 
            gutterBottom
          >
            暂无可用餐厅
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
          >
            请联系管理员添加餐厅门店
          </Typography>
        </Paper>
      )}
    </Container>
  )
}