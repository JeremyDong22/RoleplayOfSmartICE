# Restaurant Operations PWA - Tech Stack

## Project Overview
Restaurant Operations Progressive Web App (PWA) for SmartICE - a multi-restaurant management system with role-based task workflows.

## Core Technologies

### Frontend
- **React 19.1.0** - UI framework
- **TypeScript 5.8.3** - Type safety
- **Vite 7.0.4** - Build tool and dev server
- **Material-UI 7.2.0** - Component library
- **Redux Toolkit 2.8.2** - State management
- **React Router DOM 7.6.3** - Routing

### Backend & Database
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication
  - Storage (bucket: 'RolePlay')
  - Edge Functions

### Key Libraries
- **face-api.js 0.22.2** - Facial recognition for employee login
- **framer-motion 12.23.12** - Animations
- **vite-plugin-pwa 1.0.1** - PWA capabilities
- **xlsx 0.18.5** - Excel export functionality
- **date-fns 4.1.0** - Date handling
- **js-cookie 3.0.5** - Cookie management

## Development Scripts
```bash
npm run dev          # Start development server with host option
npm run build        # Production build with service worker updates
npm run build:check  # TypeScript check + production build
npm run lint         # ESLint checking
npm run preview      # Preview production build
```

## Project Structure
- `/restaurant-ops-pwa/src/` - Main application source
  - `/components/` - React components
  - `/pages/` - Page components (Manager, Chef, CEO dashboards)
  - `/services/` - Business logic and API services
  - `/store/` - Redux store configuration
  - `/contexts/` - React contexts
  - `/utils/` - Utility functions
  - `/types/` - TypeScript type definitions

## Key Features
- Multi-restaurant support
- Role-based access (Manager, Chef, Duty Manager, Staff)
- Time-period based task workflows
- Real-time task synchronization
- Facial recognition login
- PWA with offline support
- Photo and audio submission for tasks