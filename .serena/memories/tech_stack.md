# Tech Stack

## Frontend
- **React 19.1.0** with TypeScript 5.8.3
- **Vite 7.0.4** as build tool
- **Material-UI (MUI) 7.2.0** for components
- **React Router DOM 7.6.3** for navigation
- **Redux Toolkit 2.8.2** for state management
- **Framer Motion 12.23.12** for animations
- **PWA** with vite-plugin-pwa 1.0.1

## Additional Libraries
- **Supabase JS 2.55.0** for backend integration
  - ⚠️ **Critical**: No global Content-Type headers in client config
  - Let Supabase auto-detect content types for each request
- **Face-API.js 0.22.2** for face recognition
- **Date-fns 4.1.0** for date handling
- **Embla Carousel 8.6.0** for carousels
- **React Spring 10.0.1** for physics-based animations
- **Use Gesture 10.3.1** for touch gestures
- **XLSX 0.18.5** for Excel exports
- **JS-Cookie 3.0.5** for cookie management
- **UUID 11.1.0** for unique identifiers
- **Workbox 7.3.0** for service worker

## Backend & Services
- **Supabase** for:
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - File storage (RolePlay bucket for photos/audio)
  - ⚠️ Storage requires proper MIME types (no JSON override)
- **Vercel** for deployment

## Development Tools
- TypeScript 5.8.3
- ESLint 9.30.1 for linting
- Vite for dev server and builds (with HMR)
- Canvas 3.2.0 (for face-api.js)
- Dotenv 17.2.0 for environment variables

## Storage Architecture
- **LocalStorage**: Temporary draft storage
- **IndexedDB**: Failed upload queue persistence
- **Supabase Storage**: Final file storage
- **Base64 → Blob → Upload** pipeline for photos

## Known Configuration Requirements
- Supabase client must not have global Content-Type headers
- Storage uploads use explicit contentType in upload options
- Vite hot-reloads configuration changes automatically