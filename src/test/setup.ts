import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'sonner'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { reiniciarUsuarios } from '../mocks/acceso.ts'
import { reiniciarClientes } from '../mocks/clientes.ts'
import { reiniciarDatos } from '../mocks/datos.ts'
import { server } from '../mocks/server.ts'

// Radix (Select, DropdownMenu, Dialog) usa APIs de puntero que jsdom no implementa.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

// jsdom no implementa matchMedia; el menú lateral lo usa para saber si es
// celular. Las pruebas corren como escritorio.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (consulta: string) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

// MSW responde las peticiones a la API; si una prueba llama a una ruta sin
// handler, falla en lugar de salir a la red.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Cada prueba arranca con los mismos prospectos y usuarios de ejemplo, y sin sesión.
beforeEach(() => {
  reiniciarDatos()
  reiniciarUsuarios()
  reiniciarClientes()
  sessionStorage.clear()
})

// Sin globals de Vitest, React Testing Library no limpia el DOM por su cuenta
// entre pruebas; se hace aquí para que cada prueba empiece desde cero.
afterEach(() => {
  // Sonner guarda los avisos en un estado global: se cierran para que no
  // aparezcan en la siguiente prueba.
  toast.dismiss()
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
