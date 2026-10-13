import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { reiniciarUsuarios } from '../mocks/acceso.ts'
import { reiniciarDatos } from '../mocks/datos.ts'
import { server } from '../mocks/server.ts'

// MSW responde las peticiones a la API; si una prueba llama a una ruta sin
// handler, falla en lugar de salir a la red.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Cada prueba arranca con los mismos prospectos y usuarios de ejemplo, y sin sesión.
beforeEach(() => {
  reiniciarDatos()
  reiniciarUsuarios()
  sessionStorage.clear()
})

// Sin globals de Vitest, React Testing Library no limpia el DOM por su cuenta
// entre pruebas; se hace aquí para que cada prueba empiece desde cero.
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
