import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// En desarrollo, MSW simula los endpoints que el backend todavía no tiene.
// Para usar el backend real: VITE_API_MOCK=false en .env.development.local.
async function habilitarMocks() {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCK === 'false') {
    return
  }
  const { worker } = await import('./mocks/browser.ts')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

habilitarMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})
