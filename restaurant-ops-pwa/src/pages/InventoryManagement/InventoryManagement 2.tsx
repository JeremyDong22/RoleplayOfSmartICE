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
  CardContent,
  IconButton,
  Badge
} from '@mui/material'
import {
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  AddCircle as AddCircleIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  NotificationsActive as NotificationsIcon
} from '@mui/icons-material'
import { NavigationBar } from '../../components/Navigation/NavigationBar'
import { inventoryManagementService } from '../../services/inventoryManagementService'
import type { 
  InventoryStatus, 
  InventoryAlert,
  ConsumptionPrediction,
  InventoryFilter
} from '../../types/inventory.types'
import { InventoryOverview } from './components/InventoryOverview'
import { InventorySnapshot } from './components/InventorySnapshot'
import { PredictionAnalysis } from './components/PredictionAnalysis'
import { VarianceReport } from './components/VarianceReport'
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
  
  // Data states
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus[]>([])
  const [activeAlerts, setActiveAlerts] = useState<InventoryAlert[]>([])
  const [predictions, setPredictions] = useState<ConsumptionPrediction[]>([])
  
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

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load all data in parallel
      const [statusData, alertsData, predictionsData] = await Promise.all([
        inventoryManagementService.getInventoryStatus(),
        inventoryManagementService.getActiveAlerts(),
        inventoryManagementService.getConsumptionPredictions()
      ])
      
      setInventoryStatus(statusData)
      setActiveAlerts(alertsData)
      setPredictions(predictionsData)
      
      // Calculate statistics
      const criticalCount = statusData.filter(item => item.stock_status === 'critical').length
      const warningCount = statusData.filter(item => item.stock_status === 'warning').length
      const totalValue = statusData.reduce((sum, item) => sum + (item.total_price || 0), 0)
      
      setStats({
        totalItems: statusData.length,
        criticalItems: criticalCount,
        warningItems: warningCount,
        totalValue,
        alertCount: alertsData.length
      })
    } catch (err) {
      console.error('Error loading inventory data:', err)
      setError('加载库存数据失败，请刷新重试')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleRefresh = () => {
    loadData()
  }

  const getCriticalAlerts = () => {
    return activeAlerts.filter(alert => alert.alert_level === 'critical')
  }

  if (loading) {
    return (
      <>
        <NavigationBar />
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </>
    )
  }

  return (
    <>
      <NavigationBar />
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InventoryIcon fontSize="large" />
              库存管理中心
            </Typography>
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
          
          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="primary">{stats.totalItems}</Typography>
                  <Typography variant="body2" color="text.secondary">库存品项</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
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
            <Grid item xs={6} sm={3}>
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
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="primary">
                    ¥{(stats.totalValue / 10000).toFixed(1)}万
                  </Typography>
                  <Typography variant="body2" color="text.secondary">库存总值</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Critical Alerts */}
          {getCriticalAlerts().length > 0 && (
            <Alert 
              severity="error" 
              icon={<NotificationsIcon />}
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2" gutterBottom>
                紧急提醒 ({getCriticalAlerts().length})
              </Typography>
              {getCriticalAlerts().slice(0, 3).map(alert => (
                <Typography key={alert.id} variant="body2">
                  • {alert.message}
                </Typography>
              ))}
            </Alert>
          )}
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
                label={
                  <Badge badgeContent={stats.criticalItems + stats.warningItems} color="error">
                    库存盘点
                  </Badge>
                }
                icon={<AddCircleIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="预测分析" 
                icon={<TrendingUpIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="差异报告" 
                icon={<AssessmentIcon />} 
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
              inventoryStatus={inventoryStatus}
              activeAlerts={activeAlerts}
              onRefresh={loadData}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <InventorySnapshot 
              inventoryStatus={inventoryStatus}
              onComplete={loadData}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <PredictionAnalysis 
              predictions={predictions}
              inventoryStatus={inventoryStatus}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <VarianceReport />
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <HistoryRecords />
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