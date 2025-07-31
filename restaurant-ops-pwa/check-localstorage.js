// Check localStorage for task-related data
// 此脚本用于检查 localStorage 中存储的任务相关数据

console.log('=== Checking localStorage for task-related data ===\n');

// Get all localStorage keys
const allKeys = Object.keys(localStorage);
console.log(`Total localStorage keys: ${allKeys.length}`);

// Known task-related patterns based on code analysis
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
  'selectedRole',
  'broadcast_',
  'restaurant-ops-'
];

// Categorize keys
const taskRelatedKeys = [];
const photoKeys = [];
const broadcastKeys = [];
const otherKeys = [];

allKeys.forEach(key => {
  if (key.includes('photo-collection-')) {
    photoKeys.push(key);
  } else if (key.startsWith('broadcast_')) {
    broadcastKeys.push(key);
  } else if (taskPatterns.some(pattern => key.includes(pattern))) {
    taskRelatedKeys.push(key);
  } else {
    otherKeys.push(key);
  }
});

// Display results
console.log('\n📋 Task-related keys:', taskRelatedKeys.length);
taskRelatedKeys.forEach(key => {
  const value = localStorage.getItem(key);
  const size = value ? value.length : 0;
  console.log(`  - ${key} (${size} chars)`);
  
  // Parse and show summary for specific keys
  if (key === 'restaurant-ops-manager-state' || key === 'restaurant-ops-chef-state') {
    try {
      const data = JSON.parse(value);
      if (data.completedTasks) {
        console.log(`    → Completed tasks: ${data.completedTasks.length}`);
      }
      if (data.taskStatuses) {
        console.log(`    → Task statuses: ${Object.keys(data.taskStatuses).length}`);
      }
    } catch (e) {}
  }
  
  if (key === 'dutyManagerSubmissions') {
    try {
      const submissions = JSON.parse(value);
      console.log(`    → Submissions: ${submissions.length}`);
    } catch (e) {}
  }
});

console.log('\n📷 Photo collection keys:', photoKeys.length);
photoKeys.forEach(key => {
  const value = localStorage.getItem(key);
  const taskId = key.replace('photo-collection-', '');
  try {
    const photoGroups = JSON.parse(value);
    const totalPhotos = photoGroups.reduce((sum, group) => sum + group.photos.length, 0);
    console.log(`  - Task ${taskId}: ${photoGroups.length} groups, ${totalPhotos} photos`);
  } catch (e) {
    console.log(`  - ${key}: Invalid data`);
  }
});

console.log('\n📡 Broadcast keys:', broadcastKeys.length);
if (broadcastKeys.length > 0) {
  console.log('  (These are temporary communication keys)');
}

console.log('\n🗂️ Other keys:', otherKeys.length);
if (otherKeys.length > 0) {
  otherKeys.forEach(key => {
    console.log(`  - ${key}`);
  });
}

// Check memory usage
let totalSize = 0;
allKeys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    totalSize += key.length + value.length;
  }
});

console.log('\n💾 Total localStorage usage:', (totalSize / 1024).toFixed(2), 'KB');
console.log('\n=== End of localStorage check ===');