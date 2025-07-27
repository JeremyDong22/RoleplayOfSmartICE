// 时间测试辅助脚本 - 在浏览器控制台中运行
// 用于快速设置测试时间点

// 测试场景配置
const testScenarios = {
  // 开店期
  opening: {
    name: '开店期',
    time: { hour: 10, minute: 5, second: 0 },
    description: '测试开店任务和日常重置'
  },
  
  // 午市营业
  lunchService: {
    name: '午市营业',
    time: { hour: 12, minute: 30, second: 0 },
    description: '测试营业期间的任务提醒'
  },
  
  // 午市收市
  lunchClose: {
    name: '午市收市',
    time: { hour: 14, minute: 5, second: 0 },
    description: '测试收市任务'
  },
  
  // 晚市准备
  dinnerPrep: {
    name: '晚市准备',
    time: { hour: 17, minute: 5, second: 0 },
    description: '测试晚市准备任务'
  },
  
  // 预打烊
  preClosing: {
    name: '预打烊',
    time: { hour: 21, minute: 5, second: 0 },
    description: '测试Manager右滑和Chef完成按钮'
  },
  
  // 闭店
  closing: {
    name: '闭店',
    time: { hour: 21, minute: 35, second: 0 },
    description: '测试闭店任务（Manager专属）'
  },
  
  // 营业结束后
  afterHours: {
    name: '营业结束后',
    time: { hour: 22, minute: 30, second: 0 },
    description: '测试等待状态'
  },
  
  // 跨日测试 - 第二天开店
  nextDayOpening: {
    name: '第二天开店',
    time: { hour: 10, minute: 5, second: 0 },
    nextDay: true,
    description: '测试跨日任务重置'
  }
};

// 设置测试时间的函数
function setTestTime(scenario) {
  const now = new Date();
  const testTime = new Date();
  
  // 设置时间
  testTime.setHours(scenario.time.hour);
  testTime.setMinutes(scenario.time.minute);
  testTime.setSeconds(scenario.time.second);
  
  // 如果是第二天，加一天
  if (scenario.nextDay) {
    testTime.setDate(testTime.getDate() + 1);
  }
  
  // 计算偏移量
  const offset = testTime.getTime() - now.getTime();
  
  // 设置全局测试时间
  const data = {
    enabled: true,
    offset: offset,
    lastUpdated: Date.now()
  };
  
  localStorage.setItem('restaurant-ops-global-test-time', JSON.stringify(data));
  localStorage.setItem('restaurant-ops-test-time-enabled', 'true');
  
  // 触发事件通知所有标签页
  window.dispatchEvent(new CustomEvent('globalTestTimeChanged', { detail: data }));
  
  console.log(`✅ 已设置测试时间为: ${scenario.name}`);
  console.log(`   时间: ${testTime.toLocaleString('zh-CN')}`);
  console.log(`   说明: ${scenario.description}`);
}

// 清除测试时间
function clearTestTime() {
  localStorage.removeItem('restaurant-ops-global-test-time');
  localStorage.removeItem('restaurant-ops-test-time-enabled');
  window.dispatchEvent(new CustomEvent('globalTestTimeChanged', { detail: null }));
  console.log('✅ 已恢复真实时间');
}

// 运行完整测试流程
async function runFullTest() {
  console.log('🚀 开始完整测试流程...\n');
  
  const scenarios = [
    'opening',
    'lunchClose', 
    'dinnerPrep',
    'preClosing',
    'closing',
    'nextDayOpening'
  ];
  
  for (const key of scenarios) {
    const scenario = testScenarios[key];
    console.log(`\n--- ${scenario.name} ---`);
    setTestTime(scenario);
    
    // 等待用户确认
    await new Promise(resolve => {
      console.log('⏸️  检查应用状态，然后在控制台输入 next() 继续...');
      window.next = resolve;
    });
  }
  
  console.log('\n✅ 测试流程完成！');
  clearTestTime();
}

// 快速测试函数
window.testTime = {
  // 设置到指定场景
  set: (scenarioKey) => {
    const scenario = testScenarios[scenarioKey];
    if (scenario) {
      setTestTime(scenario);
    } else {
      console.log('❌ 无效的场景，可用场景：', Object.keys(testScenarios).join(', '));
    }
  },
  
  // 列出所有场景
  list: () => {
    console.log('可用测试场景：');
    Object.entries(testScenarios).forEach(([key, scenario]) => {
      console.log(`  ${key}: ${scenario.name} - ${scenario.description}`);
    });
  },
  
  // 清除测试时间
  clear: clearTestTime,
  
  // 运行完整测试
  runFull: runFullTest,
  
  // 自定义时间
  custom: (hour, minute = 0, second = 0, nextDay = false) => {
    setTestTime({
      name: '自定义时间',
      time: { hour, minute, second },
      nextDay,
      description: '自定义测试时间'
    });
  }
};

// 打印使用说明
console.log('🎯 时间测试助手已加载！\n');
console.log('使用方法：');
console.log('  testTime.list()          - 查看所有测试场景');
console.log('  testTime.set("opening")  - 设置到开店期');
console.log('  testTime.set("preClosing") - 设置到预打烊期');
console.log('  testTime.custom(21, 30)  - 设置自定义时间 (21:30)');
console.log('  testTime.clear()         - 恢复真实时间');
console.log('  testTime.runFull()       - 运行完整测试流程\n');
console.log('提示：在不同标签页登录不同角色，时间会自动同步！');