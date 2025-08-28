/**
 * History Records Component
 * Created: 2025-08-22
 * Updated: 2025-01-24 - Integrated inventory history panel
 * Updated: 2025-08-24 - Use restaurantConfigService to get restaurant ID
 * Purpose: Display inventory history and records
 */

import React, { useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { InventoryHistoryPanel } from '../../../components/InventoryHistory'
import { restaurantConfigService } from '../../../services/restaurantConfigService'

export const HistoryRecords: React.FC = () => {
  const [restaurantId, setRestaurantId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Get current restaurant ID using restaurantConfigService
    const fetchRestaurantId = async () => {
      console.log('HistoryRecords: Fetching restaurant ID using restaurantConfigService...')
      try {
        const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
        console.log('HistoryRecords: Restaurant config:', restaurantConfig)
        
        if (restaurantConfig?.id) {
          console.log('HistoryRecords: Setting restaurant ID:', restaurantConfig.id)
          setRestaurantId(restaurantConfig.id)
        } else {
          console.error('HistoryRecords: No restaurant config found')
        }
      } catch (error) {
        console.error('HistoryRecords: Error fetching restaurant config:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRestaurantId()
  }, [])
  
  console.log('HistoryRecords render - restaurantId:', restaurantId, 'loading:', loading)
  
  if (loading) {
    return <Box>Loading user data...</Box>
  }
  
  if (!restaurantId) {
    return <Box>No restaurant ID found</Box>
  }
  
  return (
    <Box sx={{ height: '100%' }}>
      <InventoryHistoryPanel restaurantId={restaurantId} />
    </Box>
  )
}