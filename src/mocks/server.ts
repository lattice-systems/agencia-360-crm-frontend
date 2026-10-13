import { setupServer } from 'msw/node'
import { handlers } from './handlers.ts'

// Servidor de MSW para las pruebas (Vitest corre en Node).
export const server = setupServer(...handlers)
