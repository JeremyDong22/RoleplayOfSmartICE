/**
 * History Records Component
 * Created: 2025-08-22
 * Updated: 2025-01-24 - Integrated inventory history panel
 * Updated: 2025-08-24 - Use restaurantConfigService to get restaurant ID
 * Updated: 2025-09-01 - Refactored to receive restaurantId as prop instead of fetching it
 * Purpose: Display inventory history and records
 */

import React from 'react'
import { Box } from '@mui/material'
import { InventoryHistoryPanel } from '../../../components/InventoryHistory'

interface HistoryRecordsProps {
  restaurantId: string
}

export const HistoryRecords: React.FC<HistoryRecordsProps> = ({ restaurantId }) => {
  console.log('HistoryRecords render - restaurantId:', restaurantId)
  
  if (!restaurantId) {
    return <Box>No restaurant ID found</Box>
  }
  
  return (
    <Box sx={{ height: '100%' }}>
      <InventoryHistoryPanel restaurantId={restaurantId} />
    </Box>
  )
}