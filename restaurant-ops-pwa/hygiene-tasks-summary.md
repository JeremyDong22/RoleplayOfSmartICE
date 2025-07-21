# Hygiene and Inspection Tasks Summary

## Chinese Task Names Related to Hygiene Inspection ("卫生")

### Front Hall Manager (前厅经理) Hygiene Tasks:

1. **开市寻店验收 - 卫生** (Opening Inspection - Hygiene)
   - Task IDs: `lunch-prep-manager-1` (10:30-11:00), `dinner-prep-manager-2` (16:35-16:50)
   - Areas: 外摆区；吧台区；出餐口区；大厅区；卫生间区；包间区
   - Sample files in: `/public/task-samples/前厅/2 - 开市寻店验收 - 卫生/`
   - Sample areas found: 外摆区卫生, 吧台区卫生, 大厅A区卫生, 大厅C区卫生, 包间区卫生, 卫生间区卫生, 出餐口区卫生

2. **收市清洁检查** (Closing Cleaning Inspection)
   - Task ID: `lunch-closing-manager-1` (14:00-14:30)
   - Description: 遵循先收市再休息原则，安排人员进行卫生清扫，原材料半成品收纳

3. **收市准备** (Pre-closing Preparation)
   - Task ID: `pre-closing-manager-1` (21:30-22:00)
   - Description: 先收市再休息，提前安排人员进行卫生清扫、原材料半成品收纳保存、物资物品收纳等工作

### Kitchen Chef (后厨主管) Hygiene Tasks:

1. **食品安全检查** (Food Safety Inspection)
   - Task IDs: `lunch-prep-chef-1` (10:30-10:45), `dinner-prep-chef-2` (16:35-16:40)
   - Description: 原材料效期检查，临期或过期变质的原材料半成品需进行记录并处理

2. **开始巡店验收** / **巡店验收** (Store Inspection)
   - Task IDs: `lunch-prep-chef-3` (11:15-11:25), `dinner-prep-chef-4` (16:50-16:55)
   - Description: 根据检查清单逐一检查确保开市工作准备完毕

3. **收市清洁检查** (Closing Cleaning Inspection)
   - Task ID: `lunch-closing-chef-1` (14:00-14:30)
   - Description: 遵循先收市再休息原则，安排人员进行卫生清扫，原材料半成品收纳

4. **收市准备** (Pre-closing Preparation)
   - Task ID: `pre-closing-chef-2` (21:30-22:00)
   - Description: 先收市再休息，提前安排人员进行卫生清扫、原材料半成品收纳保存、物资物品收纳等工作

### Duty Manager (值班经理) Safety/Security Tasks:

1. **能源安全检查** (Energy Safety Inspection)
   - Task ID: `closing-duty-manager-1` (22:00-23:00)
   - Description: 关闭所有用电设备，检查燃气阀门，确认总电源状态

2. **安防闭店检查** (Security Closing Inspection)
   - Task ID: `closing-duty-manager-2` (22:00-23:00)
   - Description: 门窗锁闭确认，监控系统启动，报警系统设置

## Task Sample Path Mappings Updated

All task IDs have been properly mapped to their corresponding sample file paths in `/src/utils/sampleLoader.ts`. The mappings include:
- All hygiene inspection tasks
- All cleaning inspection tasks
- All safety and security inspection tasks
- Food safety inspection tasks
- Store inspection tasks

These tasks ensure comprehensive hygiene and safety coverage throughout the restaurant's daily operations from opening (10:00) to closing (23:00).