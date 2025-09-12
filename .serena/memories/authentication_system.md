# Authentication System Documentation

## Current Authentication Method (As of 2025-09-12)
The application uses a **custom cookie-based authentication system**, NOT Supabase Auth.

### Key Components
- **authService.ts**: Main authentication service using cookies
- **roleplay_users table**: Stores user data with custom auth
- **Login methods**:
  1. Password login: username + "123" pattern (demo)
  2. Face recognition: Using face-api.js with descriptors

### Authentication Flow
1. User enters username/password
2. System queries `roleplay_users` table
3. Validates password (simple demo pattern)
4. Stores session in browser cookies:
   - authToken
   - userId
   - userEmail
   - userName
   - userRole
   - userRoleCode
   - restaurantId

### Database Schema
```sql
roleplay_users:
  - id (UUID)
  - username (VARCHAR)
  - full_name (VARCHAR)
  - email (VARCHAR) -- format: username.demo@gmail.com
  - role_id (UUID)
  - restaurant_id (UUID)
  - auth_user_id (UUID) -- unused, kept for potential future use
  - face_descriptor (JSONB)
  - face_enrolled_at (TIMESTAMP)
```

### Important Notes
- **NOT using Supabase Auth**: Decision made 2025-01-12 after migration testing
- **Migration Attempt**: Attempted to migrate to Supabase Auth but encountered issues:
  - Email validation problems
  - Password sync difficulties
  - Session management conflicts
- **Final Cleanup (2025-09-12)**: Removed all Supabase Auth related files
- **Face Recognition**: Works independently of auth system via face_descriptor field

### Files Removed (2025-09-12)
- authSupabaseService.ts (459 lines)
- authHybridService.ts (235 lines)
- faceRecognitionSupabaseAdapter.ts (188 lines)
- PrivateRouteHybrid.tsx (68 lines)
- TestSupabaseAuth.tsx (389 lines)
- Total: 1339 lines of code removed

### Current Authentication Files
- `/src/services/authService.ts` - Main auth service (cookie-based)
- `/src/components/PrivateRoute.tsx` - Route protection
- `/src/services/faceRecognitionService.ts` - Face auth integration

### Test Users
| Username | Password | Role |
|----------|----------|------|
| liang | liang123 | 前厅经理 |
| zhang | zhang123 | 后厨主管 |
| duty | duty123 | 值班经理 |
| yang | yang123 | 前厅经理 |

### Security Considerations
- Simple demo passwords (not for production)
- No password hashing (demo only)
- Cookie-based sessions (consider JWT for production)
- No email verification
- No password reset capability
- No MFA support

### Future Considerations
If migrating to proper auth in the future:
1. Use JWT tokens instead of cookies
2. Implement proper password hashing (bcrypt)
3. Add email verification workflow
4. Add password reset capability
5. Consider OAuth providers (Google, GitHub)
6. Implement session expiry and refresh tokens