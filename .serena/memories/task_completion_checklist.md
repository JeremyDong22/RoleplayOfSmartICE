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

4. **Clean Up**
   - Delete test files
   - Remove unused imports
   - Remove debug console.logs
   - Delete unused SQL scripts
   - Check for any temporary files created during development

5. **Documentation**
   - Add/update file header comments with changes made
   - Document complex logic
   - Update CLAUDE.md if new patterns or issues discovered

## Git Commit Guidelines
- Use conventional commits (fix:, feat:, docs:, refactor:, etc.)
- Include clear description of what was changed
- Reference issue numbers if applicable

## Important Notes
- Do NOT create new git branches unless explicitly requested
- Do NOT create README/markdown files unless requested
- Always prefer editing existing files over creating new ones
- Task records auto-approve for all roles except Duty Manager
- Always run lint and typecheck before committing

## Database Changes
- Use `mcp__supabase-mcp__apply_migration` for DDL operations
- Never hardcode IDs in data migrations
- Test with all user roles after database changes
- Document any new triggers or functions