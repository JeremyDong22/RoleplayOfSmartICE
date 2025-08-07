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

### Database-Driven Configuration (Updated 2025-08-02)
The application is now fully configured through Supabase database tables:

1. **Restaurant Configuration** (`roleplay_restaurants`)
   - Multi-restaurant support
   - No more hardcoded restaurant IDs
   - Managed via `restaurantConfigService`

2. **Business Hours** (inferred from `roleplay_workflow_periods`)
   - Opening time: First period's start time
   - Closing time: Last period's end time
   - Automatically handles cross-day operations

3. **Role & Department Mapping**
   - Roles from `roleplay_roles` table
   - Department mapping: `chef` → '后厨', others → '前厅'
   - Extensible via `getDepartmentByRole` function

4. **Storage Configuration**
   - Unified bucket name: 'RolePlay'
   - All storage operations use the same bucket
   - Path structure: `/{userId}/{date}/{taskId}/`

### Core State Management Flow
The application uses a complex state management system for handling restaurant operations:

1. **Period-based Task System**: Tasks are organized by time periods from database (`roleplay_workflow_periods`). Each period has specific tasks for Manager and Chef roles.

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

9. **Data Persistence with Supabase**:
   - All task states and records stored in database
   - Real-time synchronization across devices
   - No more localStorage for critical data
   - Restaurant configuration from database

10. **Floating Tasks Behavior** (Updated 2025-01-31):
    - Floating tasks (`isFloating: true`) can be submitted multiple times
    - They don't get marked as completed in `completedTaskIds`
    - They don't count toward completion rate
    - They don't block closing/waiting transitions
    - Each submission creates a new record in Supabase
    - UI shows success message after each submission

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

## Common Issues and Solutions

1. **Infinite Loop in useEffect**: Usually caused by including array length in dependencies. Use specific IDs or primitive values instead.

2. **Duty Tasks Not Appearing**: Check that the current time is in the closing period (22:00) and that the Duty Manager role is selected.

3. **Missing Tasks Not Updating**: Ensure the missing tasks update effect isn't running during manual closing mode.

4. **Time Not Updating in Pre-closing**: The EditableTime component provides continuous time updates via `onTimeChange` callback.

5. **Swipe Transition Reverting**: Fixed by using a ref (`manualClosingRef`) alongside state to prevent race conditions. The period update effect checks the ref for immediate feedback since React state updates are asynchronous.

## Supabase Database Schema

### Project Information
- **Project ID**: wdpeoyugsxqnpwwtkqsl
- **Region**: us-east-1
- **Database Host**: db.wdpeoyugsxqnpwwtkqsl.supabase.co

### Database Tables

1. **roleplay_restaurants** - Multi-restaurant support
   - id, name, is_active, created_at, updated_at

2. **roleplay_roles** - User roles
   - id, code (manager/chef/duty_manager/staff), name, description

3. **roleplay_users** - User accounts
   - id, email, display_name, role_code, restaurant_id, is_active

4. **roleplay_workflow_periods** - Time periods for tasks
   - id, name, display_name, start_time, end_time, is_event_driven, display_order

5. **roleplay_tasks** - Task definitions
   - id, title, description, role_code, period_id, submission_type, is_notice, is_floating, etc.

6. **roleplay_task_records** - Task submission records
   - id, task_id, user_id, restaurant_id, date, status, review_status, submission data

7. **roleplay_notice_responses** - Responses to notice tasks
   - id, notice_id, user_id, restaurant_id, comment, created_at

### Storage Configuration
- **Bucket**: `RolePlay` (public, 50MB limit)
- **Structure**: `/{userId}/{date}/{taskId}/`
- **Supported**: JPEG, PNG, WebP images; MP3, WAV, WebM audio

## Key Services

### restaurantConfigService
Manages restaurant configuration without hardcoding:
- Fetches restaurant from user profile or first active restaurant
- No more 'default-restaurant' fallbacks
- Provides restaurant ID and name dynamically

### taskService
Loads all tasks and periods from database:
- Real-time updates via Supabase channels
- Converts database format to application format
- Caches data for performance

### businessCycleService
Manages business hours and task completion:
- Infers opening/closing times from workflow periods
- Tracks task completion across the day
- Handles cross-day operations

## Testing & Development

### Time Manipulation
Use the EditableTime component to test different scenarios:
1. Click the clock icon in the top bar
2. Set specific times to trigger different states
3. The system respects manual time for testing

### Database-Only Mode
The app works without real-time features if needed:
- All data persists to database
- Manual refresh to sync changes
- Suitable for offline-first scenarios

## Best Practices

1. **No Hardcoding**: All configuration comes from Supabase
2. **Type Safety**: Use TypeScript interfaces from database types
3. **Error Handling**: Gracefully handle database connection issues
4. **Performance**: Use caching and batch operations where possible

## CEO Dashboard Features (Updated 2025-08-06)

### Time Period Grouping
The CEO dashboard now groups tasks by time periods:
- **开店准备** (10:00-11:00) - Morning preparation tasks
- **午餐服务** (11:00-14:00) - Lunch service tasks  
- **晚餐服务** (17:00-21:00) - Dinner service tasks
- **收市清理** (21:00-22:00) - Closing tasks

Each period shows:
- Color-coded header with icon
- Progress bar with period-specific color
- Expandable/collapsible task list
- Current period highlighted with border
- Task completion count

### Task Interaction Features
- **Clickable task dots**: Click to show preview bubble
- **Task badges**: Show "迟" for late tasks, "!" for error tasks
- **Preview bubble**: Shows task summary, click to open full details
- **Detail dialog**: Full task information with images/checklists
- **Hover tooltips**: Quick task info on hover

### Mobile Optimizations
- **2x2 stat cards**: Compact core metrics display
- **Responsive spacing**: Optimized for touch screens
- **Full-screen dialogs**: Better mobile viewing experience
- **Collapsible sections**: Save space on small screens
- **Touch-friendly targets**: Larger clickable areas

### Visual Improvements
- **Time period colors**: Morning (yellow), Lunch (green), Dinner (blue), Closing (purple)
- **Status indicators**: Different icons for completed/late/error states
- **Animation effects**: Smooth transitions and hover effects
- **Alert banners**: Top-positioned warnings with restaurant navigation

## CEO Dashboard Features (Updated 2025-08-07)

### Database Structure Improvements Needed
The database has restaurant-specific periods (e.g., "opening" for restaurant1, "opening-restaurant2" for restaurant2) causing duplicate periods to appear. We need to:
1. Filter periods by restaurant_id when fetching
2. Add role_code and department columns to task_records for clearer data relationships
3. Ensure proper indexing for performance

### Time Period Grouping
The CEO dashboard now groups tasks by time periods:
- **开店准备** (10:00-11:00) - Morning preparation tasks
- **午餐服务** (11:00-14:00) - Lunch service tasks  
- **晚餐服务** (17:00-21:00) - Dinner service tasks
- **收市清理** (21:00-22:00) - Closing tasks

Each period shows:
- Color-coded header with icon (now handles restaurant-specific period IDs)
- Progress bar with period-specific color
- Expandable/collapsible task list
- Current period highlighted with border
- Task completion count

### Department Filtering (Added 2025-08-07)
- Filter between 前厅 (Front Office) and 后厨 (Kitchen) departments
- Duty Manager belongs to 前厅 department
- Data for both departments loaded simultaneously to avoid re-querying
- Elegant toggle buttons with department-specific colors

### Database Connection (Added 2025-08-07)
- CEO dashboard now fetches all data from Supabase in real-time
- Restaurant-specific period filtering implemented
- Department-based task filtering with role mapping
- Automatic alerts generation based on missing/late tasks

## Stop and talk to me every time if you have confusion or you're not sure that something needs to be done or if you think something needs to be clarified into a better state. For most of the time you will need to search for codebase and make a good clarification of what we should agree on before take off.

## Be sure to make our codebase clean always after you write and run the test files. Delete those test files also. For SQL scripts and all of the scripts that are unrelated to our project and it's not in use, you should check it every time after you've done the job.