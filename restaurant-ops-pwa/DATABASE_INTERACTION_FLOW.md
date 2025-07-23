# 数据库交互流程分析

## 当前系统与数据库的交互节点

### 1. 数据读取流程 ✅ (已实现)

```
Supabase Database
    ↓
├── roleplay_tasks (任务表)
├── roleplay_workflow_periods (工作流程时段表)
└── roleplay_roles (角色表)
    ↓
taskService.ts (实时订阅)
    ↓
Redux Store (tasksSlice)
    ↓
各个 Dashboard 组件
├── ManagerDashboard
├── ChefDashboard
└── DutyManagerDashboard
```

### 2. 任务提交流程 ❌ (未实现)

```
用户完成任务
    ↓
TaskSubmissionDialog (提交对话框)
    ↓
Dashboard handleTaskComplete
    ↓
❌ 本地状态更新 (当前停在这里)
    ↓
❌ Redux submitTask action (未调用)
    ↓
❌ Supabase task_submissions 表 (未写入)
```

## 数据库交互的具体位置

### 1. 数据库连接配置
- **文件**: `src/lib/supabase.ts`
- **功能**: 创建 Supabase 客户端实例

### 2. 任务服务层
- **文件**: `src/services/taskService.ts`
- **功能**: 
  - `fetchTasks()`: 从数据库获取任务
  - `subscribeToTasks()`: 订阅任务实时更新
  - **缺失**: 任务提交功能

### 3. Redux 状态管理
- **文件**: `src/store/slices/tasksSlice.ts`
- **功能**:
  - `submitTask`: 已定义但未使用的提交函数
  - 包含完整的数据库提交逻辑

### 4. 组件层面
- **ManagerDashboard**: 
  - `handleTaskComplete` (line 560): TODO - 需要连接到数据库
  - `handleLateSubmit` (line 593): TODO - 需要连接到数据库
  
- **ChefDashboard**:
  - 类似的 TODO 注释

## 任务什么时候被上传到数据库？

**答案：目前任务完成后不会上传到数据库**

### 当前状态：
1. 任务数据从数据库读取 ✅
2. 实时更新工作正常 ✅
3. 任务完成只更新本地状态 ⚠️
4. 任务提交不会保存到数据库 ❌

### 应该的流程：
1. 用户点击"完成任务"
2. 填写提交表单（照片、视频、备注）
3. 点击提交按钮
4. 调用 `dispatch(submitTask(data))`
5. 数据插入 `task_submissions` 表
6. 更新任务状态为已完成

## 需要修复的地方

1. **连接 UI 到 Redux**:
   ```typescript
   // 在 handleTaskComplete 中添加
   dispatch(submitTask({
     taskId,
     roleId: currentUser.roleId,
     submittedBy: currentUser.id,
     photos,
     videos,
     notes,
     submittedAt: new Date().toISOString()
   }));
   ```

2. **添加错误处理和重试机制**

3. **实现离线支持**（可选）

## 相关文件清单

- `/src/lib/supabase.ts` - 数据库连接
- `/src/services/taskService.ts` - 任务数据服务
- `/src/store/slices/tasksSlice.ts` - Redux 任务状态
- `/src/pages/ManagerDashboard/ManagerDashboard.tsx` - 经理仪表板
- `/src/pages/ChefDashboard/ChefDashboard.tsx` - 厨师仪表板
- `/src/components/TaskSubmissionDialog/TaskSubmissionDialog.tsx` - 任务提交对话框