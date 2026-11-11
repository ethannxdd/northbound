import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { LootSessionProvider } from './lib/auth'
import './styles.css'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

if (import.meta.env.PROD) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <LootSessionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LootSessionProvider>
    </ConvexAuthProvider>
  </StrictMode>,
)
