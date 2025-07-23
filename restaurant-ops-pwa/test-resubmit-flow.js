// 测试重新提交流程的脚本
// 在浏览器控制台运行

console.log('=== 测试重新提交流程 ===');

// 1. 先清理所有存储
console.log('1. 清理所有存储数据...');
['restaurant-ops-manager-state', 'dutyManagerTrigger', 'dutyManagerSubmissions', 
 'dutyManagerReviewStatus', 'restaurant-ops-chef-state', 'selectedRole', 'globalTestTime'].forEach(key => {
  localStorage.removeItem(key);
});

// 2. 检查当前的Context状态
console.log('\n2. 检查当前Context状态:');
console.log('- submissions:', window.__dutyManagerContext?.submissions || '无法访问');
console.log('- reviewStatus:', window.__dutyManagerContext?.reviewStatus || '无法访问');

// 3. 手动触发一个测试提交
console.log('\n3. 如需手动测试，请按以下步骤操作:');
console.log('   a) 前厅管理刷卡触发任务');
console.log('   b) 值班经理提交任务');
console.log('   c) 前厅管理驳回任务');
console.log('   d) 值班经理重新提交');
console.log('   e) 检查前厅管理是否看到"待审核"');

// 4. 监听广播消息
console.log('\n4. 开始监听广播消息...');
const channel = new BroadcastChannel('restaurant-ops-sync');
channel.onmessage = (event) => {
  console.log('[广播消息]', event.data);
};

console.log('\n测试脚本准备完成！');