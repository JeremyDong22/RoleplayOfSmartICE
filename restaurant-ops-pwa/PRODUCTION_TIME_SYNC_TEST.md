# 生产环境时间同步测试指南

## 增强的同步机制

为确保在 Vercel 等生产环境中正常工作，系统现在使用了三重同步机制：

1. **localStorage + storage事件** - 基础跨标签页同步
2. **BroadcastChannel API** - 现代浏览器的高效同步
3. **触发器键** - 强制触发storage事件的后备方案

## 测试步骤（Vercel环境）

### 1. 准备工作
- 部署最新代码到 Vercel
- 准备3个浏览器标签页
- 清理浏览器缓存和localStorage

### 2. 多角色同步测试

1. **打开第一个标签页**
   - 访问 Vercel URL
   - 登录 Manager (13971234567/1234)
   - 注意当前显示的真实时间

2. **打开第二个标签页**（新标签页，不要复制）
   - 访问相同 URL
   - 登录 Chef (13880000000/1234)
   - 确认显示相同的真实时间

3. **打开第三个标签页**
   - 访问相同 URL  
   - 登录 CEO (需要CEO账号)
   - 确认显示相同的真实时间

4. **在任意标签页设置测试时间**
   - 在 Manager 页面点击时间旁的 ✏️
   - 设置时间为 21:05（预打烊期）
   - 点击"设置时间"

5. **验证同步结果**
   - ✅ 所有3个标签页应显示"测试模式"标签
   - ✅ 所有3个标签页时间应跳转到 21:05
   - ✅ 时间应继续同步流动（21:05:01, 21:05:02...）
   - ✅ Manager 应显示右滑卡片
   - ✅ Chef 应显示预打烊任务

### 3. 刷新测试
1. 刷新任意一个标签页
2. 验证测试时间保持不变
3. 验证"测试模式"标签仍然显示

### 4. 清除测试
1. 在任意标签页点击"测试模式"标签的 ❌
2. 验证所有标签页同时恢复真实时间

## 故障排除

### 如果同步失败：

1. **检查浏览器兼容性**
   ```javascript
   // 在控制台运行
   console.log('BroadcastChannel:', typeof BroadcastChannel !== 'undefined')
   console.log('Storage events:', 'onstorage' in window)
   ```

2. **检查localStorage**
   ```javascript
   // 查看测试时间数据
   console.log(localStorage.getItem('restaurant-ops-global-test-time'))
   ```

3. **手动触发同步**
   ```javascript
   // 强制刷新时间
   window.location.reload()
   ```

### 浏览器要求
- Chrome 54+
- Firefox 38+
- Safari 15.4+
- Edge 79+

## 同步机制详解

```javascript
// 1. 设置时间时
setGlobalTestTime(offset) {
  // 保存到localStorage
  localStorage.setItem(key, data)
  
  // 通知当前标签页
  window.dispatchEvent(customEvent)
  
  // 通知其他标签页（BroadcastChannel）
  broadcastChannel.postMessage(data)
  
  // 强制触发storage事件
  localStorage.setItem('trigger', timestamp)
}

// 2. 接收同步
- 监听 storage 事件
- 监听 BroadcastChannel 消息  
- 监听自定义事件
```

## 预期结果

- 所有角色看到相同的测试时间
- 时间持续同步流动
- 刷新页面后时间保持
- 一处修改，处处同步