# Suggested Commands

## Development Commands
```bash
# Install dependencies
npm install

# Start development server (with host access for mobile testing)
npm run dev

# Build for production
npm run build

# Build with TypeScript type checking
npm run build:check

# Preview production build locally
npm run preview

# Run ESLint
npm run lint
```

## Git Commands
```bash
# Check current status
git status

# Stage changes
git add .

# Commit changes
git commit -m "commit message"

# Push to remote
git push

# Check commit history
git log --oneline -10
```

## System Commands (Darwin/macOS)
```bash
# List files and directories
ls -la

# Navigate directories
cd <directory>

# Find files
find . -name "*.tsx"

# Search in files (use ripgrep)
rg "searchterm" --type ts

# View file contents
cat <filename>

# Create directory
mkdir <directory>

# Remove file/directory
rm -rf <path>
```

## Database/Supabase Commands
The project uses Supabase, so most database operations are done through the Supabase dashboard or SDK. No direct SQL commands are typically needed.

## Testing
No test framework is currently configured. Tests would need to be set up if required.

## Important Notes
- Always run `npm run lint` before committing code
- The project uses Vite for fast development and building
- Service worker is automatically handled by VitePWA plugin
- Time-based testing can be done using the EditableTime component in the UI