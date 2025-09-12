// Version 1.0.2 - Added error boundary and better error reporting
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// Add global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('🔥 Global error:', event.error)
  const errorDiv = document.createElement('div')
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:9999'
  errorDiv.textContent = `Error: ${event.error?.message || 'Unknown error'}`
  document.body.appendChild(errorDiv)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 Unhandled promise rejection:', event.reason)
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Root element not found!')
  document.body.innerHTML = '<h1 style="color:red">Root element not found!</h1>'
}

try {
  createRoot(rootElement!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
  console.log('✅ App initialized')
} catch (error) {
  console.error('❌ Failed to render app:', error)
  document.body.innerHTML = `<pre style="color:red">${error}</pre>`
}
