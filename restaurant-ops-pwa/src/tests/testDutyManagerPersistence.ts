// 测试值班经理任务持久化功能
// 运行方法: npx tsx src/tests/testDutyManagerPersistence.ts

import { dutyManagerPersistence } from '../services/dutyManagerPersistence'
import type { DutyManagerSubmission } from '../contexts/DutyManagerContext'

// 测试配置
const TEST_RESTAURANT_ID = 'e01868e3-5cff-4e89-9c5e-a0d4ae342b1a' // 野百灵
const TEST_USER_ID = 'test-duty-manager-001'
const TEST_REVIEWER_ID = 'test-manager-001'

async function runTests() {
  console.log('🧪 开始测试值班经理持久化功能...\n')

  try {
    // 测试1: 保存触发事件
    console.log('📝 测试1: 保存触发事件')
    const trigger = {
      type: 'last-customer-left-dinner' as const,
      triggeredAt: new Date(),
      triggeredBy: TEST_REVIEWER_ID
    }
    await dutyManagerPersistence.saveTrigger(trigger, TEST_RESTAURANT_ID)
    console.log('✅ 触发事件保存成功\n')

    // 测试2: 保存任务提交
    console.log('📝 测试2: 保存任务提交')
    const submission: DutyManagerSubmission = {
      taskId: 'closing-duty-manager-1',
      taskTitle: '能源安全检查',
      submittedAt: new Date(),
      content: {
        photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        photoGroups: [{
          id: 'group-1',
          photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
          comment: '所有设备已关闭'
        }],
        text: '检查完成，所有设备已安全关闭'
      }
    }
    await dutyManagerPersistence.saveSubmission(submission, TEST_USER_ID, TEST_RESTAURANT_ID)
    console.log('✅ 任务提交保存成功\n')

    // 测试3: 获取待审核任务
    console.log('📝 测试3: 获取待审核任务')
    const pendingSubmissions = await dutyManagerPersistence.getPendingSubmissions(TEST_RESTAURANT_ID)
    console.log(`✅ 获取到 ${pendingSubmissions.length} 个待审核任务`)
    if (pendingSubmissions.length > 0) {
      console.log('第一个任务:', {
        taskId: pendingSubmissions[0].taskId,
        taskTitle: pendingSubmissions[0].taskTitle,
        submittedAt: pendingSubmissions[0].submittedAt
      })
    }
    console.log()

    // 测试4: 获取当前触发状态
    console.log('📝 测试4: 获取当前触发状态')
    const currentTrigger = await dutyManagerPersistence.getCurrentTrigger(TEST_RESTAURANT_ID)
    if (currentTrigger) {
      console.log('✅ 获取到触发状态:', {
        type: currentTrigger.type,
        triggeredAt: currentTrigger.triggeredAt,
        triggeredBy: currentTrigger.triggeredBy
      })
    } else {
      console.log('⚠️  未找到今天的触发状态')
    }
    console.log()

    // 测试5: 更新审核状态
    console.log('📝 测试5: 更新审核状态')
    await dutyManagerPersistence.updateReviewStatus(
      'closing-duty-manager-1',
      'approved',
      TEST_REVIEWER_ID,
      '检查符合要求'
    )
    console.log('✅ 审核状态更新成功\n')

    // 测试6: 再次获取待审核任务（应该减少了）
    console.log('📝 测试6: 再次获取待审核任务')
    const remainingSubmissions = await dutyManagerPersistence.getPendingSubmissions(TEST_RESTAURANT_ID)
    console.log(`✅ 现在还有 ${remainingSubmissions.length} 个待审核任务`)
    console.log()

    // 测试7: 测试驳回功能
    console.log('📝 测试7: 测试驳回功能')
    const submission2: DutyManagerSubmission = {
      taskId: 'closing-duty-manager-2',
      taskTitle: '安防闭店检查',
      submittedAt: new Date(),
      content: {
        photos: ['https://example.com/photo3.jpg'],
        text: '门窗已锁好'
      }
    }
    await dutyManagerPersistence.saveSubmission(submission2, TEST_USER_ID, TEST_RESTAURANT_ID)
    
    await dutyManagerPersistence.updateReviewStatus(
      'closing-duty-manager-2',
      'rejected',
      TEST_REVIEWER_ID,
      '照片不清晰，请重新拍摄'
    )
    console.log('✅ 驳回功能测试成功\n')

    // 测试8: 清除当天所有提交
    console.log('📝 测试8: 清除当天所有提交')
    await dutyManagerPersistence.clearDailySubmissions(TEST_RESTAURANT_ID)
    console.log('✅ 清除功能测试成功\n')

    console.log('🎉 所有测试完成！数据库持久化功能正常工作。')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
runTests().then(() => {
  console.log('\n✨ 测试结束')
  process.exit(0)
})