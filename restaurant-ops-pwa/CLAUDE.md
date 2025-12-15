# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Progressive Web App (PWA) for restaurant operations management, built with React + TypeScript + Vite + MUI, using Supabase as the backend. The application supports multi-restaurant operations with role-based task management across different time periods throughout the day.

## 待完成的自动化任务
- **Storage照片自动清理**: 已部署Edge Function `cleanup-orphaned-photos`，需要在GitHub添加Secret `SUPABASE_ANON_KEY`来启用每日自动清理，或手动运行 `./scripts/manual-cleanup.sh`

## Commands

### Development
```bash
# From restaurant-ops-pwa directory
npm run dev          # Start development server (Vite) on port 5173
npm run build        # TypeScript check + production build with service worker versioning
npm run build:check  # TypeScript build check before production build
npm run lint         # Run ESLint
npm run preview      # Preview production build locally
```

### Important Notes
- Server runs on port 5173 with HMR (Hot Module Replacement)
- Build process auto-updates service worker version
- Always work from `/restaurant-ops-pwa` directory

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

### Important: Database Table Naming Convention
**All project-related tables use the `roleplay_` prefix.** When searching for tables or writing queries, always filter by this prefix. For example:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'roleplay_%'
```

### Core Database Tables

1. **roleplay_restaurants** - Multi-restaurant configuration
   - `id` (uuid, PK)
   - `name` (text) - Restaurant name
   - `is_active` (boolean) - Active status
   - `created_at`, `updated_at` (timestamp)

2. **roleplay_roles** - User role definitions
   - `id` (uuid, PK)
   - `code` (text) - Role code: manager, chef, duty_manager, staff, ceo
   - `name` (text) - Display name
   - `description` (text)

3. **roleplay_users** - User accounts and profiles
   - `id` (uuid, PK, FK to auth.users)
   - `email` (text)
   - `display_name` (text)
   - `role_code` (text, FK to roleplay_roles)
   - `restaurant_id` (uuid, FK to roleplay_restaurants)
   - `is_active` (boolean)
   - `face_descriptor` (text) - For face recognition login

4. **roleplay_workflow_periods** - Time period definitions
   - `id` (text, PK) - e.g., "opening", "lunch_service"
   - `name` (text) - System name
   - `display_name` (text) - Chinese display name
   - `start_time` (time) - Period start time
   - `end_time` (time) - Period end time
   - `is_event_driven` (boolean) - Manual trigger vs time-based
   - `display_order` (integer) - Sort order
   - `restaurant_id` (uuid, FK) - Restaurant-specific periods

5. **roleplay_tasks** - Task template definitions
   - `id` (uuid, PK)
   - `title` (text) - Task title
   - `description` (text) - Task description
   - `role_code` (text) - Assigned role
   - `period_id` (text, FK to roleplay_workflow_periods)
   - `submission_type` (text) - photo, audio, text, checklist, structured
   - `required_photos` (integer) - Number of photos required
   - `is_floating` (boolean) - Can be submitted multiple times
   - `is_notice` (boolean) - Information-only task
   - `floating_type` (text) - daily, anytime
   - `sort_order` (integer)
   - `samples` (jsonb) - Sample images/data for reference
   - `structured_fields` (jsonb) - Field definitions for structured input
   - `manual_closing` (boolean) - Requires manual trigger
   - `is_random_inspection` (boolean) - Random inspection task
   - `auto_generated` (boolean) - System-generated task
   - `prerequisite_periods`, `prerequisite_trigger`, `linked_tasks` - Task dependencies

6. **roleplay_task_records** - Task submission records
   - `id` (uuid, PK)
   - `task_id` (uuid, FK to roleplay_tasks)
   - `user_id` (uuid, FK to roleplay_users)
   - `restaurant_id` (uuid, FK)
   - `date` (date) - Submission date
   - `status` (text) - completed, pending, missed
   - `review_status` (text) - pending, approved, rejected (for duty_manager tasks)
   - `submission_type` (text)
   - `photos`, `audio_url`, `text_content`, `checklist_items`, `structured_data` - Submission content
   - `submitted_at`, `reviewed_at` (timestamp)
   - `is_overdue` (boolean)

7. **roleplay_notice_responses** - Responses to notice tasks
   - `id` (uuid, PK)
   - `notice_id` (uuid, FK to roleplay_tasks)
   - `user_id` (uuid, FK)
   - `restaurant_id` (uuid, FK)
   - `comment` (text)
   - `created_at` (timestamp)

8. **roleplay_daily_reports** (Materialized View) - Daily aggregated statistics
   - Pre-computed daily task completion rates by restaurant and role
   - Refreshed via scheduled job

### Storage Configuration
- **Bucket**: `RolePlay` (public, 50MB file size limit)
- **Path Structure**: `/{userId}/{date}/{taskId}/filename.ext`
- **Supported Formats**:
  - Images: JPEG, PNG, WebP
  - Audio: MP3, WAV, WebM
- **Auto-cleanup**: Edge Function removes orphaned photos older than 30 days

## Querying Supabase Data

### Finding Project Tables
Since all tables use the `roleplay_` prefix, when you need to explore the database structure:

```typescript
// In code
const { data: tables } = await supabase
  .from('information_schema.tables')
  .select('table_name')
  .like('table_name', 'roleplay_%')

// Using Supabase MCP tools
mcp__supabase__execute_sql({
  project_id: "wdpeoyugsxqnpwwtkqsl",
  query: "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'roleplay_%' ORDER BY table_name"
})
```

### Common Query Patterns

**Get tasks for a specific role and period:**
```sql
SELECT * FROM roleplay_tasks
WHERE role_code = 'manager'
  AND period_id = 'opening'
  AND is_active = true
ORDER BY sort_order
```

**Get today's task submissions for a restaurant:**
```sql
SELECT tr.*, t.title, u.display_name
FROM roleplay_task_records tr
JOIN roleplay_tasks t ON tr.task_id = t.id
JOIN roleplay_users u ON tr.user_id = u.id
WHERE tr.restaurant_id = 'xxx'
  AND tr.date = CURRENT_DATE
ORDER BY tr.submitted_at DESC
```

## Key Services

### restaurantConfigService (`src/services/restaurantConfigService.ts`)
Manages restaurant configuration without hardcoding:
- Fetches restaurant from user profile or first active restaurant
- No more 'default-restaurant' fallbacks
- Provides restaurant ID and name dynamically
- Call `await restaurantConfigService.initialize()` after login

### taskService (`src/services/taskService.ts`)
Loads all tasks and periods from Supabase database:
- Real-time updates via Supabase Realtime channels
- Converts database format to application TaskTemplate format
- Caches data for performance
- Subscription-based updates notify components of changes

### businessCycleService (`src/services/businessCycleService.ts`)
Manages business hours and task completion tracking:
- Infers opening/closing times from workflow periods
- Tracks task completion throughout the business day
- Handles cross-day operations (e.g., closing after midnight)
- Provides completion rate calculations

### taskRecordService (`src/services/taskRecordService.ts`)
Handles task submission and record management:
- Creates task records in `roleplay_task_records`
- Uploads photos/audio to Supabase Storage
- Auto-approves non-duty_manager tasks
- Manages review workflow for duty_manager submissions

### authService (`src/services/authService.ts`)
Manages user authentication and session:
- Supabase Auth integration
- Face recognition login support
- Role-based access control
- Session persistence in localStorage

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

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite 7** - Build tool and dev server
- **Material-UI v7** - Component library
  - Use `import Grid from '@mui/material/Grid'` for Grid2 component
  - Use `size` prop instead of deprecated `xs/sm/md/lg`
- **React Router v7** - Client-side routing with nested routes
- **Redux Toolkit** - State management (minimal usage, mostly React Context)
- **Framer Motion** - Animations
- **date-fns** - Date manipulation

### Backend & Infrastructure
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database with Row Level Security (RLS)
  - Realtime subscriptions for live updates
  - Storage for photos/audio files
  - Edge Functions for serverless operations
  - Auth with custom providers (email + face recognition)
- **PWA** - Progressive Web App with Service Worker
  - Offline-first architecture
  - Background sync for task submissions
  - Installable on mobile devices

### Development Tools
- **TypeScript 5.8** - Type safety
- **ESLint** - Code linting
- **Vite Plugin PWA** - Service worker generation

## Best Practices

1. **No Hardcoding**: All configuration comes from Supabase database tables
2. **Type Safety**: Use TypeScript interfaces from `src/types/database.ts`
3. **Error Handling**: Gracefully handle database connection issues with try-catch
4. **Performance**:
   - Use `Promise.all()` for parallel database queries
   - Implement caching with 5-minute TTL where appropriate
   - Lazy-load dashboard components with React.lazy()
5. **Database Queries**: Always filter by `roleplay_` prefix when searching tables
6. **Task Approval Logic**: Only duty_manager tasks require review; others auto-approve
7. **Testing**: Delete test files and unused SQL scripts after verification

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

## Quick Reference

### Common File Locations
- **Services**: `src/services/*.ts` - All business logic and Supabase interactions
- **Types**: `src/types/*.ts` - TypeScript type definitions
- **Dashboards**: `src/pages/*Dashboard/` - Role-specific dashboard components
- **Contexts**: `src/contexts/*.tsx` - React Context providers for state
- **Database Types**: `src/types/database.ts` - Auto-generated from Supabase schema

### Environment Variables (`.env`)
```bash
VITE_SUPABASE_URL=https://wdpeoyugsxqnpwwtkqsl.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Common Component Patterns

**Loading data from Supabase:**
```typescript
import { supabase } from '@/services/supabase'

const { data, error } = await supabase
  .from('roleplay_tasks')
  .select('*')
  .eq('role_code', 'manager')
  .order('sort_order')
```

**Using MUI Grid v2:**
```typescript
import Grid from '@mui/material/Grid'

<Grid container spacing={2}>
  <Grid size={{ xs: 12, md: 6 }}>Content</Grid>
</Grid>
```

## Development Workflow Guidelines

### Before Making Changes
1. **Always ask for clarification** if requirements are ambiguous
2. **Search the codebase** to understand existing patterns before implementing
3. **Check database schema** to understand data relationships
4. **Review related services** to avoid duplicating logic

### After Making Changes
1. **Delete test files** after verification
2. **Remove unused SQL scripts** and temporary code
3. **Update comments** with version numbers when modifying files
4. **Verify no hardcoded values** - all config should come from database
5. **Run linter** with `npm run lint` before committing

### When Working with Database
1. Always use `roleplay_` prefix when searching for tables
2. Filter by `restaurant_id` for multi-restaurant queries
3. Check for existing materialized views before writing complex queries
4. Use Supabase MCP tools for quick database exploration

## Important Reminders

- Task approval: Only `duty_manager` role tasks need manager review; all others auto-approve
- Time periods: Business hours are inferred from `roleplay_workflow_periods` table
- Floating tasks: Can be submitted multiple times and don't count toward completion rate
- Storage paths: Always use format `/{userId}/{date}/{taskId}/filename.ext`