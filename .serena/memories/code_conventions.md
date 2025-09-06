# Code Conventions & Style

## TypeScript/React Conventions
- **File naming**: PascalCase for components (e.g., `ManagerDashboard.tsx`)
- **Component structure**: Functional components with hooks
- **Type definitions**: Use TypeScript interfaces in `/types` directory
- **Imports**: Absolute imports from `@/` alias

## Code Style Patterns
- Material-UI `sx` prop for styling
- Redux Toolkit slices in `/store` directory
- Services pattern for API calls in `/services`
- Custom hooks in `/hooks` directory
- Constants in `/constants` directory

## Best Practices
- No abbreviations in folder/file names
- Business feature-based naming
- Comments at top of files for changes
- Clean up test files after use
- Follow existing patterns in codebase