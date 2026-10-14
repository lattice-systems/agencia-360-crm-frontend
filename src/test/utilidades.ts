import { render } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import type { Rol } from '../api/acceso.ts'
import { Toaster } from '@/components/ui/sonner'
import App from '../App.tsx'
import { tokenMock } from '../mocks/acceso.ts'
import { guardarSesion } from '../sesion/almacen.ts'

/** JWT de prueba (sin firma válida) que vence en los segundos indicados. */
export function tokenDePrueba(
  segundosParaVencer = 3600,
  rol: Rol = 'VENTAS',
  uid = 1,
): string {
  return tokenMock(
    {
      id: uid,
      usuario: 'usuario.prueba',
      nombre: 'Persona de Prueba',
      rol,
      activo: true,
    },
    segundosParaVencer,
  )
}

/**
 * Deja una sesión guardada, como si el usuario ya hubiera iniciado sesión.
 * El uid por defecto es el del vendedor dueño de los prospectos de ejemplo.
 */
export function conSesion(
  rol: Rol,
  { segundosParaVencer = 3600, uid = 1 } = {},
): string {
  const token = tokenDePrueba(segundosParaVencer, rol, uid)
  guardarSesion({
    token,
    usuario: 'usuario.prueba',
    nombre: 'Persona de Prueba',
    rol,
    expira: (Math.floor(Date.now() / 1000) + segundosParaVencer) * 1000,
  })
  return token
}

/** Renderiza la aplicación completa en la ruta indicada, con sus avisos (Sonner). */
export function renderApp(ruta = '/') {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [ruta] },
      createElement(App),
      createElement(Toaster),
    ),
  )
}
