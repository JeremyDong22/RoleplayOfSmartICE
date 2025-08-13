# Code Style and Conventions

## TypeScript Configuration
- Strict mode enabled
- ES2020 target
- Module resolution: bundler
- Separate configs for app and node environments

## File Naming Conventions
- React components: PascalCase (e.g., `LoginPageEnhanced.tsx`)
- Services: camelCase with 'Service' suffix (e.g., `taskService.ts`)
- Utils: camelCase (e.g., `httpInterceptor.ts`)
- Types: PascalCase for interfaces/types

## Code Organization
- Components are functional components using hooks
- State management uses Redux Toolkit with slices
- Services handle business logic and API calls
- Contexts provide shared state across components
- Custom hooks for reusable logic

## Import Style
```typescript
// External libraries first
import { useState, useEffect } from 'react'
import { Box, Button } from '@mui/material'

// Internal imports
import { taskService } from '@/services/taskService'
import type { Task } from '@/types'
```

## Component Structure
```typescript
const ComponentName = () => {
  // State hooks
  const [state, setState] = useState()
  
  // Redux hooks
  const dispatch = useDispatch()
  
  // Effects
  useEffect(() => {}, [])
  
  // Handlers
  const handleClick = () => {}
  
  // Render
  return <Box>...</Box>
}

export default ComponentName
```

## Material-UI Usage
- Use MUI v7 with Grid2 component
- Import Grid as: `import Grid from '@mui/material/Grid'`
- Use `size` prop instead of `xs/sm/md/lg`
- Prefer sx prop for styling over makeStyles

## State Management Patterns
- Redux for global state
- Local state with useState for component-specific data
- Contexts for cross-component communication
- Refs for preventing race conditions in critical flows

## Async Operations
- Use async/await pattern
- Handle errors with try/catch
- Show loading states during operations
- Provide user feedback on success/failure

## Comments Policy
- Minimal comments in code
- Only add comments when logic is complex or non-obvious
- Prefer self-documenting code with clear naming

## Database Interaction
- All database operations through Supabase SDK
- No hardcoded IDs or configuration
- Restaurant/role configuration from database
- Real-time subscriptions for live updates

## Error Handling
- Graceful degradation for network issues
- User-friendly error messages
- Console logging for debugging
- Error boundaries for React components