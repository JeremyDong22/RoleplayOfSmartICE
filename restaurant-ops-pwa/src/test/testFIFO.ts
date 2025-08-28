/**
 * FIFO测试脚本
 * Created: 2025-08-23
 * Purpose: 测试FIFO成本计算逻辑
 */

import { fifoService } from '../services/fifoService'
import { supabase } from '../services/supabase'

// 测试FIFO计算
async function testFIFOCalculation() {
  console.log('===== FIFO测试开始 =====\n')
  
  // 1. 获取一个有库存的物品进行测试
  const testItemName = '可乐'  // 或其他物品名
  const restaurantId = 'cf2de34f-d2c4-4e19-adcc-79fb14e2d0fa'  // 需要替换为实际的restaurant_id
  
  console.log(`测试物品: ${testItemName}`)
  console.log(`餐厅ID: ${restaurantId}\n`)
  
  // 2. 获取FIFO批次信息
  console.log('--- 获取FIFO批次 ---')
  const batches = await fifoService.getFIFOBatches(testItemName, restaurantId)
  console.log(`找到 ${batches.length} 个批次:`)
  batches.forEach((batch, index) => {
    console.log(`  批次${index + 1}: ${batch.batch_type} - ${batch.quantity}个 @ ¥${batch.unit_price} = ¥${batch.total_price}`)
    console.log(`    日期: ${batch.receipt_date}`)
  })
  console.log()
  
  // 3. 获取FIFO摘要
  console.log('--- FIFO库存摘要 ---')
  const summary = await fifoService.getFIFOSummary(testItemName, restaurantId)
  console.log(`总库存: ${summary.totalQuantity}`)
  console.log(`初始库存: ${summary.initialStockQuantity} (无价格)`)
  console.log(`收货库存: ${summary.receiptStockQuantity}`)
  console.log(`加权平均成本: ¥${summary.weightedAverageCost.toFixed(2)}`)
  console.log(`有初始库存: ${summary.hasInitialStock ? '是' : '否'}`)
  console.log()
  
  // 4. 测试不同消耗量的FIFO成本
  console.log('--- 测试FIFO成本计算 ---')
  const testQuantities = [10, 50, 100, 200]
  
  for (const qty of testQuantities) {
    console.log(`\n消耗 ${qty} 个:`)
    const result = await fifoService.calculateFIFOCost(testItemName, qty, restaurantId)
    console.log(`  总成本: ¥${result.total_cost}`)
    console.log(`  平均成本: ¥${qty > 0 ? (result.total_cost / qty).toFixed(2) : 0}`)
    
    if (result.batches_used && result.batches_used.length > 0) {
      console.log('  使用批次:')
      result.batches_used.forEach(batch => {
        console.log(`    - ${batch.batch_type}: ${batch.consumed}个 @ ¥${batch.unit_price} = ¥${batch.cost}`)
      })
    }
  }
  console.log()
  
  // 5. 模拟盘点损耗计算
  console.log('--- 模拟盘点损耗 ---')
  const previousQuantity = 100  // 上次盘点数量
  const newQuantity = 80        // 本次盘点数量
  const startDate = '2025-01-01T00:00:00Z'
  const endDate = new Date().toISOString()
  
  console.log(`上次盘点: ${previousQuantity}`)
  console.log(`本次盘点: ${newQuantity}`)
  console.log(`盘点期间: ${startDate} 至 ${endDate}`)
  
  const lossResult = await fifoService.calculateInventoryLoss(
    testItemName,
    previousQuantity,
    newQuantity,
    startDate,
    endDate,
    restaurantId
  )
  
  console.log(`\n损耗计算结果:`)
  console.log(`  期间收货: ${lossResult.receipts_quantity}`)
  console.log(`  损耗数量: ${lossResult.loss_quantity}`)
  console.log(`  损耗成本: ¥${lossResult.loss_cost}`)
  
  if (lossResult.loss_details && lossResult.loss_details.length > 0) {
    console.log('  消耗批次明细:')
    lossResult.loss_details.forEach((detail: any) => {
      console.log(`    - ${detail.batch_type}: ${detail.consumed}个 @ ¥${detail.unit_price}`)
    })
  }
  
  // 6. 预测初始库存耗尽时间
  console.log('\n--- 初始库存耗尽预测 ---')
  const dailyConsumption = 5  // 假设日消耗量
  const depletion = await fifoService.predictInitialStockDepletion(
    testItemName,
    dailyConsumption,
    restaurantId
  )
  
  console.log(`当前初始库存: ${depletion.currentInitialStock}`)
  console.log(`日消耗量: ${dailyConsumption}`)
  if (depletion.daysUntilDepletion !== null) {
    console.log(`预计耗尽天数: ${depletion.daysUntilDepletion}天`)
    console.log(`预计耗尽日期: ${depletion.depletionDate}`)
  } else {
    console.log('初始库存已耗尽或无法预测')
  }
  
  console.log('\n===== 测试完成 =====')
}

// 执行测试
testFIFOCalculation().catch(console.error)