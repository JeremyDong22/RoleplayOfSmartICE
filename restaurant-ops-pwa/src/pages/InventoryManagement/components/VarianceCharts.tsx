/**
 * Variance Charts Component
 * Created: 2025-01-24
 * Purpose: 差异报告的图表可视化组件
 */

import React from 'react'
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Grid,
  Chip
} from '@mui/material'
import {
  TrendingDown,
  Restaurant,
  Store
} from '@mui/icons-material'
import type { VarianceReportItem } from '../../../services/varianceReportService'

interface VarianceChartsProps {
  items: VarianceReportItem[]
}

export const VarianceCharts: React.FC<VarianceChartsProps> = ({ items }) => {
  // 按部门分组统计
  const departmentStats = items.reduce((acc, item) => {
    if (!acc[item.department]) {
      acc[item.department] = {
        count: 0,
        consumptionCost: 0,
        currentValue: 0,
        items: []
      }
    }
    acc[item.department].count++
    acc[item.department].consumptionCost += item.consumption_cost
    acc[item.department].currentValue += item.current_value
    acc[item.department].items.push(item)
    return acc
  }, {} as Record<string, any>)

  // 获取消耗成本最高的前5个物品
  const topConsumptionItems = [...items]
    .sort((a, b) => b.consumption_cost - a.consumption_cost)
    .slice(0, 5)

  // 计算总消耗成本
  const totalConsumptionCost = items.reduce((sum, item) => sum + item.consumption_cost, 0)

  // 格式化货币
  const formatCurrency = (value: number) => `¥${value.toFixed(2)}`

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {/* 部门消耗对比 */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            部门消耗对比
          </Typography>
          <Box sx={{ mt: 2 }}>
            {Object.entries(departmentStats).map(([dept, stats]: [string, any]) => {
              const percentage = totalConsumptionCost > 0 
                ? (stats.consumptionCost / totalConsumptionCost) * 100 
                : 0
              
              return (
                <Box key={dept} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {dept === '前厅' ? (
                        <Store sx={{ mr: 1, fontSize: 20 }} />
                      ) : (
                        <Restaurant sx={{ mr: 1, fontSize: 20 }} />
                      )}
                      <Typography variant="body2">{dept}</Typography>
                      <Chip 
                        label={`${stats.count}项`} 
                        size="small" 
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(stats.consumptionCost)}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={percentage}
                    sx={{ 
                      height: 8, 
                      borderRadius: 1,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: dept === '前厅' ? 'primary.main' : 'secondary.main'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {percentage.toFixed(1)}% · 库存价值: {formatCurrency(stats.currentValue)}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Paper>
      </Grid>

      {/* Top 5 消耗物品 */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrendingDown sx={{ mr: 1 }} />
            <Typography variant="h6">
              消耗成本 Top 5
            </Typography>
          </Box>
          <Box>
            {topConsumptionItems.map((item, index) => {
              const percentage = totalConsumptionCost > 0 
                ? (item.consumption_cost / totalConsumptionCost) * 100 
                : 0
              
              return (
                <Box key={item.item_id} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mr: 1,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: index === 0 ? 'error.main' : 
                                          index === 1 ? 'warning.main' : 
                                          'grey.400',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12
                        }}
                      >
                        {index + 1}
                      </Typography>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {item.item_name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="medium" color="error">
                      {formatCurrency(item.consumption_cost)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage}
                      sx={{ 
                        flexGrow: 1,
                        height: 6,
                        borderRadius: 1,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: index === 0 ? 'error.main' : 
                                          index === 1 ? 'warning.main' : 
                                          'grey.500'
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ ml: 1, minWidth: 40 }}>
                      {percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    消耗: {item.consumption_quantity} {item.unit} · 
                    日均: {item.daily_consumption.toFixed(1)} {item.unit}/天
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  )
}