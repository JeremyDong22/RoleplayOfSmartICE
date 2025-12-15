# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This repository contains a restaurant operations management PWA. The main application code is in the `restaurant-ops-pwa` subdirectory.

**For detailed technical documentation, see `/restaurant-ops-pwa/CLAUDE.md`**

## Key Business Rules

### Task Approval Workflow
- **值班经理 (Duty Manager)** 提交的任务需要店长审核 (review_status: pending → approved/rejected)
- **其他角色** (店长 Manager、厨师 Chef) 提交的任务自动批准 (review_status: approved)
- 原因：只有值班经理这个角色的任务需要被店长审核，店长和厨师的任务不需要被审核

### Database Information
- All project tables use the `roleplay_` prefix in Supabase
- Project ID: `wdpeoyugsxqnpwwtkqsl`
- When searching for tables, always filter with: `table_name LIKE 'roleplay_%'`

### Restaurant Mapping (餐厅映射)
系统中有多个餐厅，任务ID和数据通过后缀来区分：

| 餐厅名称 | Restaurant ID | 任务ID后缀 | 说明 |
|---------|--------------|-----------|------|
| 绵阳野百灵1958店 | `e01868e3-5cff-4e89-9c5e-a0d4ae342b1a` | 无后缀 | 基础版本/1958店 |
| 德阳野百灵店 | `893b233f-4422-4f41-b0e0-a170d92a346e` | `_deyang` | 德阳分店 |

**重要说明**：
- 不带后缀的任务ID（如 `e4b6b3d2-ff09-4466-a622-3ba6c3b97b4d`）= **绵阳野百灵1958店**
- 带 `_deyang` 后缀的任务ID（如 `e4b6b3d2-ff09-4466-a622-3ba6c3b97b4d_deyang`）= **德阳野百灵店**

## 餐厅运营时间安排

### 时期划分（roleplay_workflow_periods）
1. **开店**：10:00-10:30
2. **餐前准备 - 午市**：10:30-11:30
3. **午餐服务**：11:30-14:00
4. **餐后收市 - 午市**：14:00-15:30
5. **休息时间**：15:30-16:20（空闲时段，无系统任务）
6. **餐前准备 - 晚市**：16:20-16:45
7. **晚餐服务**：16:45-21:30
8. **收市与打烊**：21:30-00:00

### 角色职责分工
- **店长（manager）**：负责全天运营管理，在各个时期都有相应任务
- **厨师（chef）**：负责厨房相关工作，主要在开店、餐前准备、服务时段有任务
- **值班经理（duty_manager）**：只在晚上闭店时期（21:30后）负责闭店检查任务，包括：
  - 能源安全检查
  - 收市清洁检查
  - 安防闭店检查
  - 营业数据记录

## 性能优化记录 (2025-01-19)

### 数据库查询并行化优化
- **问题**: Manager和Chef仪表板加载缓慢，多个独立查询按顺序执行
- **解决方案**: 使用`Promise.all()`并行执行独立的数据库查询

#### Manager Dashboard优化结果
- **优化前**: ~7.7秒 (顺序执行所有查询)
- **优化后**: ~4.0秒 (并行执行独立查询)
- **性能提升**: 48%

#### Chef Dashboard优化结果
- **优化前**: ~3-4秒 (顺序执行)
- **优化后**: ~2秒 (并行执行)
- **性能提升**: 40-50%

#### TaskService (Duty Manager)优化结果
- **优化前**: 2730ms (loadPeriods + loadTasks顺序执行)
- **优化后**: 1630ms (并行执行)
- **性能提升**: 40%

### 剩余性能瓶颈
单个数据库查询仍然较慢:
- DutyManagerContext refresh: ~2.8秒
- Completed tasks query: ~2.4秒
- Task statuses query: ~2.9秒

### 后续优化建议
1. **数据库索引**: 在频繁查询的列上添加复合索引
2. **查询优化**: 减少数据扫描量
3. **缓存层**: 实现5分钟TTL的内存缓存