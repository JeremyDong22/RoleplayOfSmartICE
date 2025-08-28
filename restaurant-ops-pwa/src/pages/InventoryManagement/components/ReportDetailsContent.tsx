/**
 * Report Details Content Component
 * Created: 2025-08-25
 * Purpose: Display comprehensive variance report details with statistics, tables, and filters
 */

import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Button,
  Tooltip,
  LinearProgress,
  Alert
} from '@mui/material'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Inventory,
  AttachMoney,
  LocalShipping,
  CalendarToday,
  ExpandMore,
  ExpandLess,
  FilterList,
  Download,
  Info
} from '@mui/icons-material'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { SavedReport, VarianceReportItem } from '../../../services/varianceReportService'

interface ReportDetailsContentProps {
  report: SavedReport
  onExport?: (format: 'excel' | 'pdf') => void
}

// 统计卡片组件
const StatCard: React.FC<{
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  subtitle?: string
}> = ({ title, value, icon, color, subtitle }) => (
  <Card sx={{ height: '100%', bgcolor: `${color}.50`, border: `1px solid`, borderColor: `${color}.200` }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ color: `${color}.main`, mr: 1 }}>
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 600, color: `${color}.dark` }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
)

// 展开行组件 - 显示进货明细
const ExpandableRow: React.FC<{
  item: VarianceReportItem
  expanded: boolean
  onToggle: () => void
}> = ({ item, expanded, onToggle }) => (
  <>
    <TableRow hover>
      <TableCell>
        <IconButton size="small" onClick={onToggle}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </TableCell>
      <TableCell>{item.item_name}</TableCell>
      <TableCell>{item.department || '-'}</TableCell>
      <TableCell>{item.category || '-'}</TableCell>
      <TableCell>{item.unit}</TableCell>
      <TableCell align="right">{item.previous_quantity}</TableCell>
      <TableCell align="right">{item.current_quantity}</TableCell>
      <TableCell align="right">
        <Chip 
          label={item.receipts_quantity} 
          size="small" 
          color={item.receipts_quantity > 0 ? "success" : "default"}
          variant="outlined"
        />
      </TableCell>
      <TableCell align="right">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {item.consumption_quantity}
          {item.consumption_quantity > item.daily_consumption * item.days_between_counts && (
            <TrendingUp sx={{ ml: 0.5, fontSize: 16, color: 'error.main' }} />
          )}
        </Box>
      </TableCell>
      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 500 }}>
        ¥{item.consumption_cost.toFixed(2)}
      </TableCell>
      <TableCell align="right">¥{item.current_value.toFixed(2)}</TableCell>
      <TableCell align="right">{item.daily_consumption.toFixed(1)}</TableCell>
      <TableCell align="right">
        {item.variance_percentage > 0 ? (
          <Chip 
            label={`+${item.variance_percentage.toFixed(1)}%`}
            size="small" 
            color="error"
            variant="outlined"
          />
        ) : item.variance_percentage < 0 ? (
          <Chip 
            label={`${item.variance_percentage.toFixed(1)}%`}
            size="small" 
            color="success"
            variant="outlined"
          />
        ) : (
          <Chip label="0%" size="small" variant="outlined" />
        )}
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell colSpan={13} sx={{ py: 0 }}>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ m: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              进货明细 ({item.receipt_count}次)
            </Typography>
            {item.receipt_details && item.receipt_details.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>进货日期</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell align="right">单价</TableCell>
                    <TableCell align="right">总价</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {item.receipt_details.map((receipt, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {format(new Date(receipt.date), 'MM-dd HH:mm')}
                      </TableCell>
                      <TableCell align="right">{receipt.quantity}</TableCell>
                      <TableCell align="right">¥{receipt.unit_price.toFixed(2)}</TableCell>
                      <TableCell align="right">¥{receipt.total_price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                期间无进货记录
              </Typography>
            )}
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  </>
)

export const ReportDetailsContent: React.FC<ReportDetailsContentProps> = ({ report, onExport }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // 解析报告数据
  const items = report.report_data?.items || []
  const summary = report.report_data?.summary || {
    total_items: 0,
    total_consumption_cost: 0,
    total_receipts_value: 0,
    total_current_value: 0,
    avg_daily_consumption_cost: 0
  }

  // 获取唯一的部门和类别列表
  const departments = useMemo(() => {
    const depts = new Set(items.map(item => item.department).filter(Boolean))
    return Array.from(depts)
  }, [items])

  const categories = useMemo(() => {
    const cats = new Set(items.map(item => item.category).filter(Boolean))
    return Array.from(cats)
  }, [items])

  // 过滤和搜索
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDept = departmentFilter === 'all' || item.department === departmentFilter
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
      return matchesSearch && matchesDept && matchesCategory
    })
  }, [items, searchTerm, departmentFilter, categoryFilter])

  // 分页
  const paginatedItems = filteredItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  // 处理展开/收起
  const toggleRow = (itemId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedRows(newExpanded)
  }

  // 计算额外统计
  const totalReceiptCount = items.reduce((sum, item) => sum + item.receipt_count, 0)
  const highConsumptionItems = items.filter(item => 
    item.consumption_cost > summary.avg_daily_consumption_cost * report.period_days / items.length * 2
  ).length

  return (
    <Box>
      {/* 报告期间信息 */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CalendarToday sx={{ fontSize: 20 }} />
          <Typography variant="body2">
            报告期间：{format(new Date(report.period_start), 'yyyy年MM月dd日', { locale: zhCN })} 
            至 {format(new Date(report.period_end), 'yyyy年MM月dd日', { locale: zhCN })}
            （共{report.period_days}天）
          </Typography>
        </Box>
      </Alert>

      {/* 汇总统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="总消耗成本"
            value={`¥${report.total_consumption_cost.toFixed(2)}`}
            icon={<AttachMoney />}
            color="error"
            subtitle={`日均 ¥${report.avg_daily_consumption_cost.toFixed(2)}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="当前库存价值"
            value={`¥${report.total_current_value.toFixed(2)}`}
            icon={<Inventory />}
            color="primary"
            subtitle={`${report.item_count} 个物品`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="进货总价值"
            value={`¥${report.total_receipts_value.toFixed(2)}`}
            icon={<LocalShipping />}
            color="success"
            subtitle={`共 ${totalReceiptCount} 次`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="高消耗物品"
            value={highConsumptionItems}
            icon={<TrendingUp />}
            color="warning"
            subtitle="超过平均2倍"
          />
        </Grid>
      </Grid>

      {/* 搜索和筛选栏 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="搜索物品名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              select
              label="部门"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="all">全部部门</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              select
              label="类别"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="all">全部类别</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {onExport && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => onExport('excel')}
                  >
                    Excel
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => onExport('pdf')}
                  >
                    PDF
                  </Button>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 物品明细表格 */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell>物品名称</TableCell>
              <TableCell>部门</TableCell>
              <TableCell>类别</TableCell>
              <TableCell>单位</TableCell>
              <TableCell align="right">期初库存</TableCell>
              <TableCell align="right">期末库存</TableCell>
              <TableCell align="right">收货数量</TableCell>
              <TableCell align="right">消耗数量</TableCell>
              <TableCell align="right">消耗成本</TableCell>
              <TableCell align="right">当前价值</TableCell>
              <TableCell align="right">日均消耗</TableCell>
              <TableCell align="right">差异率</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <ExpandableRow
                  key={item.item_id}
                  item={item}
                  expanded={expandedRows.has(item.item_id)}
                  onToggle={() => toggleRow(item.item_id)}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    没有找到匹配的物品
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={filteredItems.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          labelRowsPerPage="每页显示"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共${count}条`}
        />
      </TableContainer>

      {/* 底部提示 */}
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Info sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          点击行首图标查看进货明细 | 差异率 = (实际消耗 - 预期消耗) / 预期消耗 × 100%
        </Typography>
      </Box>
    </Box>
  )
}