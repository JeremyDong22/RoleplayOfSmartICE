/**
 * FIFO测试页面
 * Created: 2025-08-23
 * Purpose: 测试和验证FIFO成本计算逻辑
 */

import React, { useState, useEffect } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  Grid
} from '@mui/material'
import { Calculate, Refresh, TrendingDown } from '@mui/icons-material'
import { fifoService } from '../services/fifoService'
import { supabase } from '../services/supabase'

interface TestResult {
  itemName: string
  consumedQuantity: number
  totalCost: number
  batches: any[]
  message: string
}

export const TestFIFO: React.FC = () => {
  const [itemName, setItemName] = useState('可乐')
  const [consumedQuantity, setConsumedQuantity] = useState(10)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // 获取餐厅ID（这里先硬编码，实际应该从context获取）
  const restaurantId = 'cf2de34f-d2c4-4e19-adcc-79fb14e2d0fa'

  // 加载批次信息
  const loadBatches = async () => {
    setLoading(true)
    try {
      const batchData = await fifoService.getFIFOBatches(itemName, restaurantId)
      setBatches(batchData)
      
      const summaryData = await fifoService.getFIFOSummary(itemName, restaurantId)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading batches:', error)
    } finally {
      setLoading(false)
    }
  }

  // 测试FIFO计算
  const testFIFOCalculation = async () => {
    setLoading(true)
    try {
      const result = await fifoService.calculateFIFOCost(
        itemName,
        consumedQuantity,
        restaurantId
      )
      
      let message = ''
      if (result.total_cost === 0) {
        message = '消耗的全部是无价格的初始库存，成本为0'
      } else {
        const avgCost = consumedQuantity > 0 ? (result.total_cost / consumedQuantity).toFixed(2) : '0'
        message = `平均单价: ¥${avgCost}`
      }
      
      setTestResult({
        itemName,
        consumedQuantity,
        totalCost: result.total_cost,
        batches: result.batches_used || [],
        message
      })
      
      // 重新加载批次信息
      await loadBatches()
    } catch (error) {
      console.error('Error testing FIFO:', error)
    } finally {
      setLoading(false)
    }
  }

  // 模拟盘点
  const simulateInventoryCount = async () => {
    setLoading(true)
    try {
      // 模拟参数
      const previousQuantity = 100
      const newQuantity = 70
      const startDate = '2025-01-01T00:00:00Z'
      const endDate = new Date().toISOString()
      
      const result = await fifoService.calculateInventoryLoss(
        itemName,
        previousQuantity,
        newQuantity,
        startDate,
        endDate,
        restaurantId
      )
      
      setTestResult({
        itemName,
        consumedQuantity: result.loss_quantity,
        totalCost: result.loss_cost,
        batches: result.loss_details || [],
        message: `盘点损耗: ${result.loss_quantity}个, 期间收货: ${result.receipts_quantity}个`
      })
    } catch (error) {
      console.error('Error simulating inventory count:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBatches()
  }, [itemName])

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        FIFO成本计算测试
      </Typography>
      
      {/* 输入区域 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="物品名称"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="消耗数量"
              type="number"
              value={consumedQuantity}
              onChange={(e) => setConsumedQuantity(Number(e.target.value))}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Calculate />}
                onClick={testFIFOCalculation}
                disabled={loading}
              >
                计算FIFO
              </Button>
              <Button
                variant="outlined"
                startIcon={<TrendingDown />}
                onClick={simulateInventoryCount}
                disabled={loading}
              >
                模拟盘点
              </Button>
              <Button
                variant="text"
                startIcon={<Refresh />}
                onClick={loadBatches}
                disabled={loading}
              >
                刷新
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 库存摘要 */}
      {summary && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>库存摘要</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">总库存</Typography>
                <Typography variant="h6">{summary.totalQuantity}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">初始库存</Typography>
                <Typography variant="h6" color={summary.initialStockQuantity > 0 ? 'warning.main' : 'text.primary'}>
                  {summary.initialStockQuantity}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">收货库存</Typography>
                <Typography variant="h6" color="success.main">{summary.receiptStockQuantity}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">加权平均价</Typography>
                <Typography variant="h6">¥{summary.weightedAverageCost.toFixed(2)}</Typography>
              </Grid>
            </Grid>
            {summary.hasInitialStock && (
              <Alert severity="info" sx={{ mt: 2 }}>
                存在{summary.initialStockQuantity}个无价格的初始库存，将在FIFO中优先被消耗
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 批次列表 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          FIFO批次队列
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>序号</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>日期</TableCell>
                <TableCell align="right">数量</TableCell>
                <TableCell align="right">单价</TableCell>
                <TableCell align="right">总价</TableCell>
                <TableCell align="right">累计数量</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {batches.map((batch, index) => (
                <TableRow 
                  key={batch.record_id}
                  sx={{ 
                    bgcolor: batch.batch_type === 'initial' ? 'warning.lighter' : 'inherit'
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Chip 
                      label={batch.batch_type === 'initial' ? '初始' : '收货'} 
                      size="small"
                      color={batch.batch_type === 'initial' ? 'warning' : 'success'}
                    />
                  </TableCell>
                  <TableCell>{new Date(batch.receipt_date).toLocaleDateString()}</TableCell>
                  <TableCell align="right">{batch.quantity}</TableCell>
                  <TableCell align="right">¥{batch.unit_price}</TableCell>
                  <TableCell align="right">¥{batch.total_price}</TableCell>
                  <TableCell align="right">{batch.cumulative_quantity}</TableCell>
                </TableRow>
              ))}
              {batches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    暂无批次数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 计算结果 */}
      {testResult && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            FIFO计算结果
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1">
              物品: <strong>{testResult.itemName}</strong>
            </Typography>
            <Typography variant="body1">
              消耗数量: <strong>{testResult.consumedQuantity}</strong>
            </Typography>
            <Typography variant="body1">
              总成本: <strong>¥{testResult.totalCost.toFixed(2)}</strong>
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {testResult.message}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            消耗批次明细:
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>批次类型</TableCell>
                  <TableCell>批次日期</TableCell>
                  <TableCell align="right">消耗数量</TableCell>
                  <TableCell align="right">单价</TableCell>
                  <TableCell align="right">成本</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {testResult.batches.map((batch, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Chip 
                        label={batch.batch_type === 'initial' ? '初始' : '收货'} 
                        size="small"
                        color={batch.batch_type === 'initial' ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell>{new Date(batch.batch_date).toLocaleDateString()}</TableCell>
                    <TableCell align="right">{batch.consumed}</TableCell>
                    <TableCell align="right">¥{batch.unit_price}</TableCell>
                    <TableCell align="right">¥{batch.cost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  )
}