# Database Architecture

## Supabase Project Details
- **Project ID**: wdpeoyugsxqnpwwtkqsl
- **Region**: us-east-1
- **Database Host**: db.wdpeoyugsxqnpwwtkqsl.supabase.co

## Core Tables

### roleplay_restaurants
- Multi-restaurant support
- Fields: id, name, is_active, created_at, updated_at

### roleplay_roles
- User roles definition
- Codes: manager, chef, duty_manager, staff, ceo
- Fields: id, code, name, description

### roleplay_users
- User accounts
- Links to roles and restaurants
- Fields: id, email, display_name, role_code, restaurant_id, is_active

### roleplay_workflow_periods
- Time periods for daily operations
- Examples: opening, lunch, dinner, closing
- Fields: id, name, display_name, start_time, end_time, is_event_driven, display_order

### roleplay_tasks
- Task definitions per role and period
- Supports floating tasks (can be submitted multiple times)
- Fields: id, title, description, role_code, period_id, submission_type, is_notice, is_floating

### roleplay_task_records
- Actual task submissions
- Tracks completion status and review status
- Fields: id, task_id, user_id, restaurant_id, date, status, review_status, submission data

### roleplay_notice_responses
- Responses to notice-type tasks
- Fields: id, notice_id, user_id, restaurant_id, comment, created_at

## Storage Configuration
- **Bucket Name**: RolePlay (unified, public)
- **Structure**: /{userId}/{date}/{taskId}/
- **File Types**: JPEG, PNG, WebP images; MP3, WAV, WebM audio
- **Size Limit**: 50MB per file

## Key Relationships
1. Users belong to a restaurant and have a role
2. Tasks are assigned to roles and periods
3. Task records link tasks to users and restaurants
4. Periods define the daily workflow structure

## Important Notes
- No hardcoded IDs - everything database-driven
- Real-time subscriptions for live updates
- Restaurant-specific configuration support
- Automatic approval for non-manager tasks
- Manager tasks require store manager review