import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/fredoka'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App'

const dsn = import.meta.env.VITE_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    integrations: (defaults) => defaults.filter((integration) => integration.name !== 'BrowserSession'),
    dataCollection: { userInfo: false, urlQueryParams: false },
    beforeSend(event) {
      delete event.request
      delete event.breadcrumbs
      delete event.user
      return event
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<main role="alert">CombusLab encountered an error. Reload the page to try again.</main>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
