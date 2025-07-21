# Supabase Database Schema Documentation

This document describes the database schema for the Restaurant Operations PWA that has been created in Supabase.

## Project Details
- **Project ID**: wdpeoyugsxqnpwwtkqsl
- **Project Name**: JeremyDong22's Project
- **Region**: us-east-1
- **Database Host**: db.wdpeoyugsxqnpwwtkqsl.supabase.co

## Database Tables

### 1. roleplay_restaurants
Stores restaurant information for multi-location support.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| name | VARCHAR(100) | Restaurant name |
| code | VARCHAR(50) | Unique restaurant code |
| address | TEXT | Restaurant address |
| city | VARCHAR(50) | City |
| opening_time | TIME | Default: 10:00:00 |
| closing_time | TIME | Default: 22:00:00 |
| timezone | VARCHAR(50) | Default: Asia/Shanghai |
| is_active | BOOLEAN | Default: true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Initial Data**: Restaurant "野百灵" (code: YBL001) has been created.

### 2. roleplay_roles
Defines user roles in the system.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| role_code | VARCHAR(20) | Unique role identifier |
| role_name_zh | VARCHAR(50) | Chinese role name |
| role_name_en | VARCHAR(50) | English role name |
| department | VARCHAR(20) | Department (前厅/后厨) |
| permissions | JSONB | Permission configuration |
| sort_order | INTEGER | Display order |
| is_active | BOOLEAN | Default: true |
| created_at | TIMESTAMP | |

**Initial Data**: 
- CEO (总经理)
- Manager (前厅经理) - Front of House
- Chef (后厨主管) - Kitchen
- Staff (员工)

### 3. roleplay_users
User accounts linked to auth.users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK, FK) | References auth.users |
| username | VARCHAR(50) | Unique username |
| full_name | VARCHAR(100) | Full name |
| phone | VARCHAR(20) | Phone number |
| role_id | UUID (FK) | References roleplay_roles |
| restaurant_id | UUID (FK) | References roleplay_restaurants |
| avatar_url | TEXT | Avatar image URL |
| is_active | BOOLEAN | Default: true |
| last_login_at | TIMESTAMP | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### 4. roleplay_period_transitions
Tracks when users enter/exit workflow periods.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK) | References roleplay_users |
| restaurant_id | UUID (FK) | References roleplay_restaurants |
| date | DATE | Date of transition |
| period_id | VARCHAR(50) | Period identifier |
| entered_at | TIMESTAMP | Entry time |
| exited_at | TIMESTAMP | Exit time (nullable) |
| manual_override | BOOLEAN | Default: false |
| created_at | TIMESTAMP | |

**Period IDs**: opening, lunch-prep, lunch-service, lunch-closing, dinner-prep, dinner-service, pre-closing, closing

### 5. roleplay_tasks
Task definitions (template).

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(100) (PK) | Task identifier |
| title | VARCHAR(200) | Task title |
| description | TEXT | Task description |
| role_code | VARCHAR(20) | Role (manager/chef) |
| period_id | VARCHAR(50) | Period (NULL for floating) |
| submission_type | VARCHAR(20) | photo/audio/text/NULL |
| required_photos | INTEGER | Default: 1 |
| is_floating | BOOLEAN | Default: false |
| is_notice | BOOLEAN | Default: false |
| floating_type | VARCHAR(20) | daily/anytime |
| prerequisite_periods | TEXT[] | Array of period IDs |
| sort_order | INTEGER | Display order |
| is_active | BOOLEAN | Default: true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Initial Data**: 59 tasks loaded from workflowParser.ts

### 6. roleplay_task_records
Actual task instances and submissions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK) | References roleplay_users |
| restaurant_id | UUID (FK) | References roleplay_restaurants |
| task_id | VARCHAR(100) (FK) | References roleplay_tasks |
| date | DATE | Task date |
| period_id | VARCHAR(50) | Period ID |
| **Status Fields** | | |
| status | VARCHAR(20) | pending/completed/skipped/overdue |
| is_floating | BOOLEAN | Default: false |
| is_late | BOOLEAN | Default: false |
| is_makeup | BOOLEAN | Default: false |
| makeup_reason | TEXT | Reason for makeup submission |
| original_period | VARCHAR(50) | Original period for makeup |
| **Time Fields** | | |
| scheduled_start | TIMESTAMP | |
| scheduled_end | TIMESTAMP | |
| actual_start | TIMESTAMP | |
| actual_complete | TIMESTAMP | |
| **Submission Fields** | | |
| submission_type | VARCHAR(20) | photo/audio/text |
| text_content | TEXT | Text submission or transcript |
| photo_urls | TEXT[] | Array of photo URLs |
| photo_folder | VARCHAR(255) | Storage folder path |
| audio_url | TEXT | Audio file URL |
| audio_duration | INTEGER | Duration in seconds |
| **Metadata** | | |
| location | POINT | GPS location |
| device_info | JSONB | Device information |
| submission_metadata | JSONB | Additional metadata |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### 7. roleplay_notice_responses
Responses to notice tasks.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK) | References roleplay_users |
| restaurant_id | UUID (FK) | References roleplay_restaurants |
| task_id | VARCHAR(100) | Notice task ID |
| date | DATE | Response date |
| period_id | VARCHAR(50) | Period ID |
| response_text | TEXT | Response content |
| response_type | VARCHAR(20) | acknowledgment/issue_report/suggestion |
| photo_urls | TEXT[] | Optional photo evidence |
| photo_folder | VARCHAR(255) | Storage folder path |
| created_at | TIMESTAMP | |

## Storage Configuration

### Bucket: restaurant-tasks
- **Public**: Yes
- **File Size Limit**: 50MB
- **Allowed MIME Types**: 
  - Images: image/jpeg, image/jpg, image/png, image/webp
  - Audio: audio/mpeg, audio/mp3, audio/wav, audio/webm

### Storage Structure
```
restaurant-tasks/
└── {restaurant_id}/
    └── {date}/
        └── {task_record_id}/
            ├── photo_1.jpg
            ├── photo_2.jpg
            └── audio.mp3
```

## Connection to Frontend

To connect the frontend application to these tables:

1. Update `src/services/supabase.ts` with the project URL and anon key
2. Create TypeScript types matching these table structures
3. Implement data access functions for:
   - User authentication and profile management
   - Task generation from templates
   - Task submission and storage upload
   - Period transition tracking
   - Notice response handling

## Important Notes

- All tables use UUID primary keys (except roleplay_tasks which uses VARCHAR)
- Foreign key relationships are established between tables
- Proper indexes are created for performance
- The schema supports multi-restaurant operations
- Task records combine submission content with task status
- Photos and audio files are stored in Supabase Storage, not in the database