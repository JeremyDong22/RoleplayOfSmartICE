# Suggested Development Commands

## Project Root Commands
```bash
# Install all dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Restaurant PWA Commands
```bash
# Navigate to PWA directory
cd restaurant-ops-pwa

# Development server (with host access)
npm run dev

# Production build (includes SW version update)
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Preview production build
npm run preview
```

## Quality Checks (IMPORTANT - Run before committing)
```bash
# Run both type checking and linting
npm run typecheck && npm run lint

# Build to verify no compilation errors
npm run build
```

## Git Commands (Darwin/macOS)
```bash
git status
git add .
git commit -m "message"
git push
git diff
git log --oneline -n 10
```

## Supabase Database Commands
```bash
# Execute SQL queries (via Supabase MCP)
# Use mcp__supabase-mcp__execute_sql for queries
# Use mcp__supabase-mcp__apply_migration for DDL operations

# List tables
# Use mcp__supabase-mcp__list_tables

# Check logs for debugging
# Use mcp__supabase-mcp__get_logs with service type
```

## System Commands
```bash
ls -la                  # List files with details
find . -name "*.ts"     # Find TypeScript files
grep -r "pattern" .     # Search in files (use Grep tool instead)
open .                  # Open in Finder (macOS)
pwd                     # Current directory
```

## Testing Commands
```bash
# Run development server and test with time manipulation
npm run dev
# Then use EditableTime component in UI to test different times

# Check for duplicate task records in database
# Use mcp__supabase-mcp__execute_sql with appropriate query
```

## Build Output Notes
- Build creates files in `dist/` directory
- Service worker auto-updates with git version
- Some chunks may be >500KB (normal for main bundle)
- PWA manifest and service worker generated automatically

## Important Notes
- Always run `npm run lint` and `npm run typecheck` before committing
- Build process updates service worker version automatically
- Use Claude's tools (Grep, Glob, etc.) instead of bash commands when possible
- These commands should be documented in CLAUDE.md for AI reference