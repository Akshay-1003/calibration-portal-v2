import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'
import { ENV } from './core/config/env'
import { queryClient } from './core/query/queryClient'
import { AppWrapper } from './components/common/PageMeta'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={ENV.GOOGLE_CLIENT_ID}>
      <AppWrapper>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </AppWrapper>
    </GoogleOAuthProvider>
  </StrictMode>,
)
