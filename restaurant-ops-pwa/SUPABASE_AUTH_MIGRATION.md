# Supabase Auth Migration Guide

## ✅ Migration Status: READY

The Supabase Auth migration infrastructure has been successfully implemented and tested.

## 🚀 Quick Start

### Test the Migration
1. Navigate to: http://localhost:5173/test-supabase-auth
2. Toggle "Use Supabase Auth" to enable migration
3. Login with any existing user to trigger automatic migration

### Available Test Users

| Username | Password | Role | Migration Status |
|----------|----------|------|------------------|
| `liang` | `liang123` | 梁店长 | ✅ Migrated |
| `yang` | `yang123` | 杨店长 | Pending |
| `zhang` | `zhang123` | 张主厨 | Pending |
| `duty` | `duty123` | 值班经理 | Pending |

## 📋 What Was Implemented

### 1. **Database Changes**
- ✅ Added `email` column to roleplay_users
- ✅ Added `migration_status` column to track migration
- ✅ Added `auth_user_id` column to link with Supabase Auth
- ✅ Updated all emails to use `.com` domain (required by Supabase)

### 2. **New Services**
- **authSupabaseService.ts**: Handles Supabase Auth operations
- **authHybridService.ts**: Manages dual authentication during migration
- **faceRecognitionSupabaseAdapter.ts**: Adapts face recognition to work with Supabase

### 3. **Features**
- ✅ Zero-downtime migration
- ✅ Automatic user migration on login
- ✅ Support for both auth systems simultaneously
- ✅ Face recognition compatibility
- ✅ Migration tracking and statistics

## 🔄 How Migration Works

1. **User attempts login** → System checks if Supabase Auth is enabled
2. **If enabled** → Try Supabase Auth first
3. **If user not migrated** → Fall back to legacy auth
4. **On successful legacy login** → Create user in Supabase Auth
5. **Update database** → Mark user as migrated
6. **Next login** → Use Supabase Auth directly

## 🎯 Next Steps for Production

### Phase 1: Testing (Current)
- [x] Test with individual users
- [ ] Monitor for any issues
- [ ] Collect feedback

### Phase 2: Gradual Rollout
- [ ] Enable for 10% of users
- [ ] Monitor performance
- [ ] Fix any issues
- [ ] Expand to 50% → 100%

### Phase 3: Cleanup
- [ ] Remove legacy auth code
- [ ] Update all UI components
- [ ] Documentation update

## 🔒 Security Improvements

With Supabase Auth, you now get:
- ✅ **Proper password hashing** (bcrypt)
- ✅ **JWT-based sessions** (more secure than cookies)
- ✅ **Email verification** support
- ✅ **Password reset** capability
- ✅ **MFA ready** (can be enabled)
- ✅ **OAuth support** (Google, GitHub, etc.)

## 📊 Monitoring Migration

Check migration progress at: http://localhost:5173/test-supabase-auth

Click "Migration Stats" to see:
- Total users
- Migrated users
- Pending users
- Migration percentage

## ⚠️ Important Notes

1. **Email Format**: All users now use `@restaurant.com` emails
2. **Password Pattern**: Currently using `{username}123` pattern
3. **Face Recognition**: Works with both auth systems
4. **Session Management**: JWT tokens stored in localStorage

## 🛠️ Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| 400 Bad Request on signup | User already exists, system will sign in instead |
| 406 Not Acceptable | Fixed by updating foreign key syntax |
| HTML nesting warnings | Fixed by restructuring component hierarchy |
| Email validation error | Fixed by changing `.local` to `.com` |

### Debug Commands

```sql
-- Check migration status
SELECT username, email, migration_status, auth_user_id 
FROM roleplay_users;

-- Check Supabase auth users
SELECT email, created_at, email_confirmed_at 
FROM auth.users;

-- Check specific user
SELECT * FROM roleplay_users 
WHERE username = 'liang';
```

## 📝 Configuration

### Enable/Disable Supabase Auth

```javascript
// Enable programmatically
authHybridService.setUseSupabaseAuth(true);

// Or via localStorage
localStorage.setItem('USE_SUPABASE_AUTH', 'true');
```

### Environment Variables

Ensure these are set in `.env`:
```
VITE_SUPABASE_URL=https://wdpeoyugsxqnpwwtkqsl.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## ✨ Benefits of Migration

1. **Enhanced Security**: Industry-standard authentication
2. **Better UX**: Password reset, email verification
3. **Scalability**: Ready for thousands of users
4. **Modern Features**: OAuth, MFA, passwordless login
5. **Compliance**: Better for regulatory requirements

## 📧 Contact

For issues or questions about the migration, check:
- Test page: http://localhost:5173/test-supabase-auth
- Browser console for detailed logs
- Supabase dashboard for auth logs

---

*Migration implemented: 2025-01-12*
*Status: Active and Working*