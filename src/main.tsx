import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { BrowserRouter } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="agencia360.crm.tema"
        >
          <TooltipProvider>
            <App />
            <Toaster position="bottom-right" duration={4000} />
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})
