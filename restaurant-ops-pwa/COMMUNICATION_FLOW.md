# 🔄 跨页面通信机制说明

## 📡 当前使用的通信方式

### 1. **BroadcastChannel API** (主要方式)
- 浏览器原生 API，用于同一域名下不同标签页/窗口之间的通信
- 文件：`src/services/broadcastService.ts`
- 频道名：`restaurant-ops-channel`

### 2. **LocalStorage + Context** (备用方式)
- 当 BroadcastChannel 不支持时的降级方案
- 数据存储在 localStorage，通过 Context 共享

### 3. **Supabase Realtime** (未来可用)
- WebSocket 实时通信
- 目前主要用于任务数据更新，还未用于任务分配

## 🎯 经理分配任务给值班经理的流程

```
前厅经理页面                     值班经理页面
    |                              |
    |  1. 右滑"安排任务"            |
    |  ↓                           |
    |  handleLastCustomerLeft()     |
    |  ↓                           |
    |  创建审核任务                  |
    |  ↓                           |
    |  通过 BroadcastChannel 发送    |
    |  消息类型：STATE_SYNC          |
    |  数据：DUTY_MANAGER_TRIGGER    |
    |  ↓                           |
    |--------------------------------> 
    |                              |
    |                              ↓
    |                              DutyManagerContext 
    |                              接收到消息
    |                              ↓
    |                              触发任务显示
    |                              ↓
    |                              值班经理看到新任务
```

## 📝 具体代码流程

### 1. 经理端发送（ManagerDashboard）
```typescript
// 当经理右滑后
const handleLastCustomerLeft = () => {
  // 创建触发器
  const trigger = {
    type: 'last-customer-left-lunch',
    triggeredAt: new Date(),
    triggeredBy: 'manager'
  }
  
  // 通过 Context 设置（会自动广播）
  setTrigger(trigger)
}
```

### 2. Context 广播（DutyManagerContext）
```typescript
const setTrigger = (trigger: DutyManagerTrigger) => {
  setCurrentTrigger(trigger)
  
  // 通过 BroadcastChannel 广播
  broadcastService.send({
    type: 'STATE_SYNC',
    sender: 'system',
    timestamp: Date.now(),
    data: {
      type: 'DUTY_MANAGER_TRIGGER',
      trigger
    }
  })
  
  // 同时保存到 localStorage
  localStorage.setItem('dutyManagerTrigger', JSON.stringify(trigger))
}
```

### 3. 值班经理端接收（DutyManagerDashboard）
```typescript
// Context 自动监听广播
useEffect(() => {
  const unsubscribe = broadcastService.subscribe('STATE_SYNC', (message) => {
    if (message.data?.type === 'DUTY_MANAGER_TRIGGER') {
      // 更新状态，触发任务显示
      setCurrentTrigger(message.data.trigger)
    }
  })
}, [])
```

## 🔍 为什么这样设计？

### 优点：
1. **实时性** - 消息立即到达，无需刷新
2. **可靠性** - localStorage 作为备份
3. **简单性** - 不依赖服务器中转

### 局限性：
1. **仅限同一浏览器** - 不同设备无法通信
2. **需要打开标签页** - 关闭的标签页收不到

## 🚀 未来改进方案

### 使用 Supabase Realtime（推荐）
```typescript
// 发送方
await supabase
  .from('task_assignments')
  .insert({
    from_role: 'manager',
    to_role: 'duty_manager',
    task_data: {...},
    created_at: new Date()
  })

// 接收方（自动）
supabase
  .channel('task-assignments')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'task_assignments',
    filter: 'to_role=eq.duty_manager'
  }, (payload) => {
    // 显示新任务
  })
  .subscribe()
```

### 优势：
1. **跨设备** - 任何地方都能收到
2. **持久化** - 任务记录在数据库
3. **离线支持** - 上线后能收到离线消息

## 📊 当前通信类型

```typescript
// BroadcastService 支持的消息类型
type MessageType = 
  | 'LAST_CUSTOMER_LEFT_LUNCH'     // 午市收市
  | 'LAST_CUSTOMER_LEFT_DINNER'    // 晚市收市
  | 'PERIOD_CHANGED'               // 时段变化
  | 'TASK_COMPLETED'               // 任务完成
  | 'STATE_SYNC'                   // 状态同步（主要）
  | 'CLEAR_ALL_STORAGE'            // 清除存储
```

## 🔧 测试方法

1. 打开两个浏览器标签页
2. 一个登录经理，一个登录值班经理
3. 经理页面右滑"安排任务"
4. 值班经理页面应立即看到新任务

## ⚡ 快速调试

在浏览器控制台：
```javascript
// 查看当前广播频道
const channel = new BroadcastChannel('restaurant-ops-channel')

// 监听所有消息
channel.onmessage = (e) => console.log('收到消息:', e.data)

// 手动发送测试消息
channel.postMessage({
  type: 'STATE_SYNC',
  sender: 'system',
  timestamp: Date.now(),
  data: {
    type: 'DUTY_MANAGER_TRIGGER',
    trigger: {
      type: 'last-customer-left-lunch',
      triggeredAt: new Date(),
      triggeredBy: 'test'
    }
  }
})
```

---

**总结**：当前使用 BroadcastChannel API 进行同浏览器的实时通信，配合 localStorage 持久化。未来可以升级到 Supabase Realtime 实现跨设备通信。