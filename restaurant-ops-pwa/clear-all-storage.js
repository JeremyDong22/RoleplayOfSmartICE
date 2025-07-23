// 清理所有相关的 localStorage 数据
// 在浏览器控制台运行此脚本

console.log('开始清理所有存储数据...');

// 列出所有要清理的键
const keysToRemove = [
  // 前厅管理相关
  'restaurant-ops-manager-state',
  
  // 值班经理相关
  'dutyManagerTrigger',
  'dutyManagerSubmissions', 
  'dutyManagerReviewStatus',
  
  // 厨师相关
  'restaurant-ops-chef-state',
  
  // 其他可能的键
  'selectedRole',
  'globalTestTime'
];

// 清理指定的键
keysToRemove.forEach(key => {
  if (localStorage.getItem(key) !== null) {
    console.log(`清除: ${key}`);
    localStorage.removeItem(key);
  }
});

// 列出所有剩余的localStorage键
console.log('\n剩余的localStorage键:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`- ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
}

console.log('\n清理完成！请刷新页面。');