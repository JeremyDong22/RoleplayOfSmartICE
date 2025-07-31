// 在浏览器控制台运行此代码来检查 localStorage 中的任务数据
// Run this code in browser console to check task data in localStorage

(() => {
  console.log('=== Checking localStorage for task-related data ===\n');

  // Get all localStorage keys
  const allKeys = Object.keys(localStorage);
  console.log(`Total localStorage keys: ${allKeys.length}`);

  // Known task-related patterns
  const taskPatterns = [
    'restaurant-ops-manager-state',
    'restaurant-ops-chef-state',
    'dutyManagerTrigger',
    'dutyManagerSubmissions',
    'dutyManagerReviewStatus',
    'duty-manager-fallback-messages',
    'dutyManagerDashboardState',
    'photo-collection-',
    'lunch-closing-confirmed',
    'pre-closing-confirmed',
    'selectedRole'
  ];

  // Categorize and analyze
  const results = {
    managerTasks: 0,
    chefTasks: 0,
    dutyManagerSubmissions: 0,
    photoCollections: {},
    otherTaskData: []
  };

  allKeys.forEach(key => {
    const value = localStorage.getItem(key);
    
    if (key === 'restaurant-ops-manager-state') {
      try {
        const data = JSON.parse(value);
        results.managerTasks = (data.completedTasks || []).length;
        console.log(`\n📋 Manager State:`);
        console.log(`  - Completed tasks: ${results.managerTasks}`);
        console.log(`  - Task statuses: ${Object.keys(data.taskStatuses || {}).length}`);
      } catch (e) {}
    }
    
    else if (key === 'restaurant-ops-chef-state') {
      try {
        const data = JSON.parse(value);
        results.chefTasks = (data.completedTasks || []).length;
        console.log(`\n👨‍🍳 Chef State:`);
        console.log(`  - Completed tasks: ${results.chefTasks}`);
        console.log(`  - Task statuses: ${Object.keys(data.taskStatuses || {}).length}`);
      } catch (e) {}
    }
    
    else if (key === 'dutyManagerSubmissions') {
      try {
        const submissions = JSON.parse(value);
        results.dutyManagerSubmissions = submissions.length;
        console.log(`\n📝 Duty Manager Submissions: ${submissions.length}`);
        submissions.forEach((sub, i) => {
          console.log(`  ${i+1}. ${sub.taskName} - ${sub.status || 'pending'}`);
        });
      } catch (e) {}
    }
    
    else if (key.startsWith('photo-collection-')) {
      try {
        const taskId = key.replace('photo-collection-', '');
        const photoGroups = JSON.parse(value);
        const totalPhotos = photoGroups.reduce((sum, group) => sum + group.photos.length, 0);
        results.photoCollections[taskId] = totalPhotos;
      } catch (e) {}
    }
    
    else if (taskPatterns.some(pattern => key.includes(pattern))) {
      results.otherTaskData.push(key);
    }
  });

  // Summary
  console.log('\n📊 Summary:');
  console.log(`  - Manager tasks completed: ${results.managerTasks}`);
  console.log(`  - Chef tasks completed: ${results.chefTasks}`);
  console.log(`  - Duty manager submissions: ${results.dutyManagerSubmissions}`);
  console.log(`  - Photo collections: ${Object.keys(results.photoCollections).length} tasks`);
  
  if (Object.keys(results.photoCollections).length > 0) {
    console.log('\n📷 Photo Collections:');
    Object.entries(results.photoCollections).forEach(([taskId, count]) => {
      console.log(`  - Task ${taskId}: ${count} photos`);
    });
  }

  // Memory usage
  let totalSize = 0;
  allKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) totalSize += key.length + value.length;
  });
  
  console.log(`\n💾 Total localStorage usage: ${(totalSize / 1024).toFixed(2)} KB`);
  
  return results;
})();