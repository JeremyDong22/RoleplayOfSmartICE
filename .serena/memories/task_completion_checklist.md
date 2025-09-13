# Task Completion Checklist

## After Making Code Changes

1. **Run Linting**
   ```bash
   cd restaurant-ops-pwa && npm run lint
   ```

2. **Type Checking**
   ```bash
   cd restaurant-ops-pwa && npm run typecheck
   ```
   Note: `npm run build` also runs type checking

3. **Test in Dev Server**
   ```bash
   cd restaurant-ops-pwa && npm run dev
   ```

4. **Database Testing** (if applicable)
   - Use supabase-roleplay-manager agent for roleplay table operations
   - Verify task records are properly stored with metadata
   - Test with different user roles (chef, manager, staff)
   - Check department-based filtering (前厅/后厨)

5. **Clean Up**
   - Delete test files
   - Remove unused imports
   - Remove debug console.logs
   - Delete unused SQL scripts
   - Check for any temporary files created during development

6. **Documentation**
   - Add/update file header comments with changes made
   - Document complex logic
   - Update CLAUDE.md if new patterns or issues discovered
   - Update relevant memory files in Serena if significant changes made

## Git Commit Guidelines
- Use conventional commits (fix:, feat:, docs:, refactor:, etc.)
- Include clear description of what was changed
- Reference issue numbers if applicable
- Always run lint and typecheck before committing

## Important Notes
- Do NOT create new git branches unless explicitly requested
- Do NOT create README/markdown files unless requested
- Always prefer editing existing files over creating new ones
- Task records auto-approve for all roles except Duty Manager
- Always run lint and typecheck before committing
- Use `roleCode` field for role detection, NOT `role` field

## Database Changes
- Use `mcp__supabase-mcp__apply_migration` for DDL operations
- Use supabase-roleplay-manager agent for roleplay_ table operations
- Never hardcode IDs in data migrations
- Test with all user roles after database changes
- Document any new triggers or functions
- Remember: roleplay_task_records contains metadata field for additional info

## Memory Management
- Update Serena memories when significant changes are made
- Use `/serena_memory_update` command periodically
- Document new patterns and fixes in appropriate memory files
- Keep memory files current with recent enhancements

## Role-based Testing Checklist
- **Chef Role**: Test 后厨 department filtering
- **Manager/Staff**: Test 前厅 department filtering  
- **Duty Manager**: Test approval workflow
- **Random Inspections**: Verify metadata includes zone/table info