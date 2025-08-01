# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start development server (Vite)
npm run build        # TypeScript check + production build
npm run lint         # Run ESLint
npm run preview      # Preview production build locally
```

### Testing a specific time period
When testing time-based features, use the EditableTime component in the top bar:
1. Click the edit icon next to the time
2. Set specific times to test different periods:
   - 10:00-10:30: Opening period
   - 21:30: Pre-closing period (triggers swipe card for Manager)
   - Any time outside business hours: Shows waiting state

## Architecture Overview

### Core State Management Flow
The application uses a complex state management system for handling restaurant operations:

1. **Period-based Task System**: Tasks are organized by time periods defined in `workflowPeriods` (workflowParser.ts). Each period has specific tasks for Manager and Chef roles.

2. **Manual State Transitions**: 
   - `isManualClosing`: Controls manual transition to closing period via swipe gesture
   - `isWaitingForNextDay`: Maintains waiting state after closing until next opening
   - Period update effect checks these flags to prevent automatic period updates

3. **Missing Tasks Tracking**: 
   - Tasks from past periods are tracked in `missingTasks` state
   - Protected from being overwritten during manual closing mode
   - Pre-closing tasks are added to missing tasks when transitioning to closing

### Key Components Interaction

**ManagerDashboard/ChefDashboard**
- Main containers that orchestrate all state
- Handle period transitions and task management
- Control when to show TaskCountdown vs ClosedPeriodDisplay

**TaskCountdown**
- Displays current period timer and tasks one by one
- Shows swipe card for Manager during pre-closing
- Handles different time display modes (countdown vs current time)

**TaskSummary**
- Side panel showing task completion status
- Displays missing tasks from previous periods
- Shows completion statistics

### Critical Logic Patterns

1. **Automatic Duty Task Assignment** (Updated):
   ```
   Closing period (22:00) → Duty tasks automatically appear for Duty Manager →
   Manager receives audit tasks to review Duty Manager submissions
   ```

2. **Chef Pre-closing Completion**:
   ```
   Pre-closing period → Complete all 3 tasks → Show "当前状态已完成" → 
   Red button "完成收尾工作" appears → Click button → Validate missing tasks → 
   Transition to waiting state (下一阶段：开店)
   ```
   Important: Chef skips closing period entirely - goes directly from pre-closing to waiting for next day's opening

3. **Waiting State Logic**:
   - Both Manager and Chef enter waiting state after their respective red buttons
   - Waiting state persists even if time is still in pre-closing/closing period
   - ONLY exits waiting state when time reaches opening period (10:00 AM)
   - Uses `waitingRef` for immediate synchronous feedback to prevent race conditions
   - Critical: `if (isWaitingForNextDay)` check only allows exit for `current.id === 'opening'`

4. **Daily Task Reset at 10:00 AM**:
   - All task states are cleared when crossing 10:00 AM
   - Waiting state is cleared if active
   - Allows testing with time manipulation
   - Ensures fresh start each day

5. **Time Rewind Handling**:
   The period update effect detects when time changes during manual states and resets appropriately to prevent stuck states.

6. **Task Completion Tracking**:
   - `completedTaskIds`: Array of ALL completed task IDs throughout the day (accumulates across periods)
   - `taskStatuses`: Detailed status with completion time and overdue flags
   - `missingTasks`: Tasks from past periods that weren't completed
   - Important: `completedTaskIds` is only cleared at 10:00 AM daily reset or when clicking red button

7. **Completion Rate Calculation**:
   - Formula: completed tasks / all tasks from started periods
   - Counts all tasks from periods that have started up to current time
   - Only counts non-notice tasks
   - Chef skips closing period tasks
   - Shows 100% if no tasks are due
   - Uses accumulated `completedTaskIds` to track progress throughout the day

8. **Race Condition Prevention**:
   - Uses refs (`manualClosingRef`, `waitingRef`) alongside state for immediate feedback
   - Refs are set before state updates to block unwanted period updates
   - Prevents period update effect from reverting manual state transitions

9. **Data Persistence with localStorage**:
   - States persist across page refreshes using `persistenceManager.ts`
   - Separate storage keys for Manager (`restaurant-ops-manager-state`) and Chef (`restaurant-ops-chef-state`)
   - Automatically saves: completedTaskIds, taskStatuses, noticeComments, missingTasks, isManualClosing, isWaitingForNextDay
   - Data automatically resets at 10:00 AM daily when crossing from 9:xx to 10:xx
   - Handles corrupted data gracefully by returning null
   - Validates data freshness using timestamps

### Material-UI Grid v2 Usage
The project uses MUI v7 with the new Grid2 component. Import as:
```typescript
import Grid from '@mui/material/Grid'
```
Use `size` prop instead of `xs/sm/md/lg` props.

### PWA Configuration
- Service worker auto-updates enabled
- Offline caching for Supabase API calls
- Manifest configured for standalone app installation

## Important State Dependencies

1. **Period Update Effect Dependencies**: `[testTime, isManualClosing, currentPeriod?.id, isWaitingForNextDay]`
   - Order matters to prevent infinite loops
   - Don't include derived states

2. **Missing Tasks Update Protection**: 
   - Skips updates during `isManualClosing` or `closing` period
   - Prevents overwriting tasks added during swipe transition

3. **Task Structure Requirements**:
   - All tasks must have `isNotice: boolean` property
   - Notices are displayed separately from actionable tasks
   - Only non-notice tasks count toward completion

4. **Floating Tasks Behavior** (Updated 2025-01-31):
   - Floating tasks (`isFloating: true`) can be submitted multiple times
   - They don't get marked as completed in `completedTaskIds`
   - They don't count toward completion rate
   - They don't block closing/waiting transitions
   - Each submission creates a new record in Supabase
   - UI shows success message after each submission

## Common Issues and Solutions

1. **Infinite Loop in useEffect**: Usually caused by including array length in dependencies. Use specific IDs or primitive values instead.

2. **Duty Tasks Not Appearing**: Check that the current time is in the closing period (22:00) and that the Duty Manager role is selected.

3. **Missing Tasks Not Updating**: Ensure the missing tasks update effect isn't running during manual closing mode.

4. **Time Not Updating in Pre-closing**: The EditableTime component provides continuous time updates via `onTimeChange` callback.

5. **Swipe Transition Reverting**: Fixed by using a ref (`manualClosingRef`) alongside state to prevent race conditions. The period update effect checks the ref for immediate feedback since React state updates are asynchronous.

## Task Requirements Synchronization

When modifying task requirements (photo, audio, text input), you MUST keep these three files synchronized:

1. **`src/utils/workflowParser.ts`** - The source of truth for task definitions
   - Update the `uploadRequirement` field ('拍照' | '录音' | '记录' | null)

2. **`public/task-samples/任务与文件夹对照表.md`** - Documentation for sample file mappings
   - Update the sample files column to reflect changes
   - Note if folders are deleted due to removed requirements

3. **`门店日常工作.md`** - The human-readable workflow documentation
   - Remove or add the requirement suffix (- 拍照, - 录音, - 记录) from task descriptions

Example: If removing photo requirement from "开店准备与设备检查":
- workflowParser.ts: Change `uploadRequirement: '拍照'` to `uploadRequirement: null`
- 任务与文件夹对照表.md: Update to show "(已删除 - 无需拍照)"
- 门店日常工作.md: Remove "- 拍照" from the task description

## Supabase Database Schema

The application is connected to a Supabase database with the following structure:

### Project Information
- **Project ID**: wdpeoyugsxqnpwwtkqsl
- **Region**: us-east-1
- **Database Host**: db.wdpeoyugsxqnpwwtkqsl.supabase.co

### Database Tables (7 tables created with prefix `roleplay_`)

1. **roleplay_restaurants** - Multi-restaurant support (currently has "野百灵")
2. **roleplay_roles** - User roles (CEO, Manager, Chef, Staff)
3. **roleplay_users** - User accounts linked to auth.users
4. **roleplay_period_transitions** - Tracks period entry/exit times
5. **roleplay_tasks** - Task definitions (59 tasks pre-loaded)
6. **roleplay_task_records** - Task instances with submission content
7. **roleplay_notice_responses** - Responses to notice tasks

### Storage Configuration
- **Bucket**: `restaurant-tasks` (public, 50MB limit)
- **Structure**: `restaurant-tasks/{restaurant_id}/{date}/{task_record_id}/`
- **Supported**: JPEG, PNG, WebP images; MP3, WAV, WebM audio

### Key Design Features
- Task records combine status and submission content in one table
- Photos/audio stored in Storage, URLs in database
- Support for makeup tasks with reason tracking
- Floating tasks (like 收货验货) independent of time periods
- All tables indexed for performance

For detailed schema information, see `SUPABASE_SCHEMA.md`

## Task Sample File Standards

### Checklist JSON Format
When creating checklist.json files for tasks with `uploadRequirement: '列表'`, use this standard format:

```json
{
  "items": [
    "检查项目名称 - 具体描述",
    "设备名称 - 检查要点"
  ]
}
```

Example:
```json
{
  "items": [
    "插座 - 检查所有电磁炉插座是否正常通电",
    "冰箱 - 检查制冷温度",
    "空调 - 检查制冷温度"
  ]
}
```

This format is used for all checklist-type tasks including equipment checks and material preparation