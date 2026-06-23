import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import './sprout.css'
import App from './app.jsx'
import { ErrorBoundary } from './screens-error.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster position="bottom-center" richColors />
    </ErrorBoundary>
  </StrictMode>,
)
