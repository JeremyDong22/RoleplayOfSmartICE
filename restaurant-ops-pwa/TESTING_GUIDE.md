# 值班经理任务持久化测试指南

## 测试准备
1. 确保开发服务器正在运行: `npm run dev`
2. 打开浏览器访问: http://localhost:5173 (或显示的端口)

## 测试步骤

### 1. 测试值班经理提交任务

1. **登录为前厅管理员**
   - 选择"前厅管理"角色
   - 等待到晚上21:30（或使用时间编辑器调整到21:30）
   - 向右滑动"最后客人离店"

2. **切换到值班经理**
   - 返回角色选择页面
   - 选择"值班经理"
   - 你应该看到3个任务：
     - 能源安全检查
     - 安防闭店检查
     - 营业数据记录

3. **提交任务**
   - 点击第一个任务"能源安全检查"
   - 拍照或上传照片
   - 点击提交
   - 观察是否显示"已提交"状态

### 2. 测试前厅管理审核

1. **切换回前厅管理**
   - 返回角色选择页面
   - 选择"前厅管理"
   - 检查控制台是否显示：`[ManagerDashboard] Duty manager submissions updated:`

2. **查看待审核任务**
   - 应该能看到值班经理提交的任务
   - 点击查看详情
   - 测试"通过"和"驳回"功能

### 3. 测试跨设备同步

1. **打开隐私窗口**
   - 在新的隐私/无痕窗口打开同一地址
   - 登录为前厅管理
   - 应该能看到之前提交的待审核任务

2. **测试离线场景**
   - 关闭其中一个窗口
   - 在另一个窗口提交新任务
   - 重新打开第一个窗口
   - 检查是否能看到新提交的任务

### 4. 验证数据库存储

1. **检查Supabase数据库**
   ```sql
   -- 查看今天的值班经理任务记录
   SELECT 
     id, task_id, user_id, status, review_status, 
     created_at, reviewed_at, reject_reason
   FROM roleplay_task_records
   WHERE task_id LIKE 'closing-duty-manager-%'
     AND date = CURRENT_DATE
   ORDER BY created_at DESC;
   ```

2. **检查触发记录**
   ```sql
   -- 查看触发事件记录
   SELECT *
   FROM roleplay_task_records
   WHERE task_id LIKE 'trigger-%'
     AND date = CURRENT_DATE;
   ```

## 预期结果

✅ **成功标志**：
- 值班经理提交后，前厅管理立即收到通知
- 关闭页面重新打开，数据仍然存在
- 不同设备间数据同步
- 审核状态正确更新
- 驳回后可以重新提交

❌ **可能的问题**：
- 如果看不到提交的任务，检查餐厅ID是否正确设置
- 如果实时通信失败，检查Supabase连接
- 如果数据不持久，检查数据库权限

## 控制台日志

正常情况下应该看到：
```
[RestaurantSetup] Initialized restaurant: 野百灵 e01868e3-5cff-4e89-9c5e-a0d4ae342b1a
[DutyManagerContext] Loaded submissions from database: [...]
[RealtimeDutyService] ✓ Connected to Supabase Realtime
[DutyManagerPersistence] Submission saved to database: closing-duty-manager-1
[ManagerDashboard] Duty manager submissions updated: [...]
```

## 测试完成标准

- [ ] 值班经理能成功提交任务
- [ ] 前厅管理能实时收到任务
- [ ] 审核功能正常（通过/驳回）
- [ ] 跨设备数据同步正常
- [ ] 数据库正确存储所有记录
- [ ] 页面刷新后数据不丢失