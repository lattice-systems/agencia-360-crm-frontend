import { setupWorker } from 'msw/browser'
import { handlers } from './handlers.ts'

// Service worker de MSW para `npm run dev` (simula el backend en el navegador).
export const worker = setupWorker(...handlers)
