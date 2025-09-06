# Task Completion Checklist

## After Making Code Changes

1. **Run Linting**
   ```bash
   cd restaurant-ops-pwa && npm run lint
   ```

2. **Type Checking** (if TypeScript changes)
   ```bash
   cd restaurant-ops-pwa && npm run build:check
   ```

3. **Test in Dev Server**
   ```bash
   cd restaurant-ops-pwa && npm run dev
   ```

4. **Clean Up**
   - Delete test files
   - Remove unused imports
   - Remove debug console.logs
   - Delete unused SQL scripts

5. **Documentation**
   - Add/update file header comments
   - Document complex logic

## Important Notes
- Do NOT create new git branches unless explicitly requested
- Do NOT create README/markdown files unless requested
- Always prefer editing existing files over creating new ones
- Task records auto-approve for all roles except Duty Manager