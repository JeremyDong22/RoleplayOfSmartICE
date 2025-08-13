# Task Completion Checklist

When completing any development task, follow these steps:

## Before Starting
1. Search and understand the codebase structure
2. Check existing implementations for patterns to follow
3. Verify no duplicate functionality exists
4. Clarify requirements if anything is unclear

## During Development
1. Follow existing code conventions and patterns
2. Use TypeScript types properly
3. Handle errors gracefully
4. Add loading states for async operations
5. Ensure mobile responsiveness

## After Implementation
1. **Run linting**: `npm run lint`
   - Fix any linting errors before proceeding
   
2. **Test the changes**:
   - Start dev server: `npm run dev`
   - Test functionality in browser
   - Check mobile responsiveness
   - Verify no console errors
   
3. **Clean up**:
   - Delete any test files created during development
   - Remove unused imports
   - Remove console.log statements
   - Delete any SQL scripts or temporary files
   
4. **Verify build**:
   - Run `npm run build:check` to ensure TypeScript compilation succeeds
   - Fix any type errors

## Important Reminders
- NEVER commit unless explicitly asked
- Clean up all test files after testing
- Check for and remove any unused scripts
- Ensure no sensitive data in code
- Add top-of-file comments when creating/modifying files (per user instructions)

## Database Considerations
- Verify changes work with Supabase
- Check real-time subscriptions still function
- Ensure no hardcoded IDs or configurations
- Test with actual database data

## Final Steps
1. Provide instructions on how to use/start the project
2. Document any new environment variables needed
3. Update CLAUDE.md if significant changes made