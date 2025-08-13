import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Temporarily disable HTTP interceptor as it's interfering with Supabase
// import './utils/httpInterceptor'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// Service worker registration is handled by VitePWA plugin
// No need to manually register

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
