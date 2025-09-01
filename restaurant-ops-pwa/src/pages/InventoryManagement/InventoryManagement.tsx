/**
 * Inventory Management Main Page
 * Created: 2025-08-22
 * Purpose: Main interface for the inventory management system
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Grid,
  Card,
  CardContent
} from '@mui/material'
import {
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  AddCircle as AddCircleIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material'
import { NavigationBar } from '../../components/Navigation/NavigationBar'
import { inventoryManagementService } from '../../services/inventoryManagementService'
import { inventoryService } from '../../services/inventoryService'
import { inventoryRealtimeService } from '../../services/inventoryRealtimeService'
import { inventoryHistoryService } from '../../services/inventoryHistoryService'
import { authService } from '../../services/authService'
import { restaurantConfigService } from '../../services/restaurantConfigService'
import { useRefreshable } from '../../contexts/RefreshContext'
import type { 
  InventoryStatus, 
  InventoryAlert,
  ConsumptionPrediction,
  InventoryFilter,
  InventoryPrediction
} from '../../types/inventory.types'
import { InventoryOverview } from './components/InventoryOverview'
import { PredictionAnalysis } from './components/PredictionAnalysis'
import { InventorySnapshot } from './components/InventorySnapshot'
import { HistoryRecords } from './components/HistoryRecords'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export const InventoryManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Get current user role and convert from database format (duty_manager) to route format (duty-manager)
  const currentUser = authService.getCurrentUser()
  const roleCodeMap: Record<string, 'manager' | 'chef' | 'duty-manager' | 'ceo'> = {
    'manager': 'manager',
    'chef': 'chef',
    'duty_manager': 'duty-manager',
    'ceo': 'ceo'
  }
  const userRole = currentUser?.roleCode ? roleCodeMap[currentUser.roleCode] : undefined
  
  // Data states
  const [inventoryPredictions, setInventoryPredictions] = useState<InventoryPrediction[]>([])
  const [alertItems, setAlertItems] = useState<InventoryPrediction[]>([])
  const [restaurantId, setRestaurantId] = useState<string>('')
  const [inventoryItems, setInventoryItems] = useState<any[]>([]) // 库存盘点需要的数据
  const [realtimeInventory, setRealtimeInventory] = useState<any[]>([]) // 库存概览需要的数据
  const [historyRecords, setHistoryRecords] = useState<any[]>([]) // 历史记录数据
  const [uniqueHistoryItems, setUniqueHistoryItems] = useState<string[]>([]) // 历史记录物品列表
  const [dataLoaded, setDataLoaded] = useState(false) // 标记数据是否已加载
  
  // Filter state
  const [filter, setFilter] = useState<InventoryFilter>({
    stockStatus: 'all'
  })
  
  // Statistics
  const [stats, setStats] = useState({
    totalItems: 0,
    criticalItems: 0,
    warningItems: 0,
    totalValue: 0,
    alertCount: 0
  })

  // Load data function
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load restaurant ID first
      const restaurantConfig = await restaurantConfigService.getCurrentRestaurant()
      let currentRestaurantId = ''
      if (restaurantConfig?.id) {
        currentRestaurantId = restaurantConfig.id
        setRestaurantId(currentRestaurantId)
      }
      
      // Load all data in parallel for better performance
      const [predictions, items, realtimeData, historyData, uniqueItems] = await Promise.all([
        inventoryManagementService.getAllPredictions(),
        inventoryService.getAllInventory(),
        inventoryRealtimeService.getRealtimeInventory(),
        currentRestaurantId ? inventoryHistoryService.getHistoryRecords({
          restaurant_id: currentRestaurantId,
          operation_type: 'all',
          department: 'all'
        }) : Promise.resolve([]),
        currentRestaurantId ? inventoryHistoryService.getUniqueItemNames(currentRestaurantId) : Promise.resolve([])
      ])
      
      setInventoryPredictions(predictions)
      setInventoryItems(items)
      setRealtimeInventory(realtimeData)
      setHistoryRecords(historyData)
      setUniqueHistoryItems(uniqueItems)
      
      // Filter alert items
      const alerts = predictions.filter(p => p.need_alert)
      setAlertItems(alerts)
      
      // Calculate statistics
      const criticalCount = alerts.length
      const totalItems = predictions.length
      const itemsWithData = predictions.filter(p => p.confidence_level > 0)
      
      // 计算库存总值（基于FIFO价值）
      const totalValue = predictions.reduce((sum, item) => {
        return sum + (item.total_price || 0)
      }, 0)
      
      setStats({
        totalItems,
        criticalItems: criticalCount,
        warningItems: 0, // 简化后不再区分warning
        totalValue, // 使用实际计算的总值
        alertCount: criticalCount
      })
      
      setDataLoaded(true) // 标记数据已加载
    } catch (err) {
      console.error('Error loading inventory data:', err)
      setError('加载库存数据失败，请刷新重试')
    } finally {
      setLoading(false)
    }
  }

  // Register refresh callback
  useRefreshable(async () => {
    await loadData()
  }, [])

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const getCriticalAlerts = () => {
    return alertItems
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InventoryIcon fontSize="large" />
              库存管理中心
            </Typography>
          </Box>
          
          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="primary">{stats.totalItems}</Typography>
                  <Typography variant="body2" color="text.secondary">库存品项</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card sx={{ bgcolor: stats.criticalItems > 0 ? 'error.light' : 'background.paper' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color={stats.criticalItems > 0 ? 'error.contrastText' : 'text.primary'}>
                    {stats.criticalItems}
                  </Typography>
                  <Typography variant="body2" color={stats.criticalItems > 0 ? 'error.contrastText' : 'text.secondary'}>
                    紧急补货
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card sx={{ bgcolor: stats.warningItems > 0 ? 'warning.light' : 'background.paper' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color={stats.warningItems > 0 ? 'warning.contrastText' : 'text.primary'}>
                    {stats.warningItems}
                  </Typography>
                  <Typography variant="body2" color={stats.warningItems > 0 ? 'warning.contrastText' : 'text.secondary'}>
                    预警物品
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="primary">
                    {stats.totalValue >= 10000 
                      ? `¥${(stats.totalValue / 10000).toFixed(1)}万`
                      : `¥${stats.totalValue.toFixed(0)}`
                    }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">库存总值</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
        </Box>

        {/* Main Content Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab 
                label="库存概览" 
                icon={<InventoryIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="预测分析" 
                icon={<TrendingUpIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="库存盘点"
                icon={<AddCircleIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="历史记录" 
                icon={<ReceiptIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <InventoryOverview 
              inventoryItems={realtimeInventory}
              onRefresh={loadData}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <PredictionAnalysis 
              inventoryPredictions={inventoryPredictions}
              alertItems={alertItems}
              onRefresh={loadData}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <InventorySnapshot 
              onComplete={loadData}
              initialData={inventoryItems}
              skipInitialLoad={!dataLoaded}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <HistoryRecords 
              restaurantId={restaurantId}
              historyRecords={historyRecords}
              uniqueItems={uniqueHistoryItems}
            />
          </TabPanel>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Container>
    </>
  )
}