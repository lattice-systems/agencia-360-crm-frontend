// Guarda la sesión en sessionStorage: se conserva al recargar la página y se
// borra al cerrar la pestaña. Una sesión con el token vencido no se devuelve.
import type { Rol, SesionApi } from '../api/acceso.ts'

const CLAVE = 'agencia360.crm.sesion'

export interface Sesion {
  token: string
  usuario: string
  nombre: string
  rol: Rol
  /** Momento en que vence el token, en milisegundos desde epoch. */
  expira: number
}

/** Lee el campo exp del JWT. No valida la firma: eso lo hace el backend. */
export function expiracionDelToken(token: string): number | null {
  const partes = token.split('.')
  if (partes.length !== 3) {
    return null
  }
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    const relleno = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const contenido = JSON.parse(atob(relleno)) as { exp?: unknown }
    return typeof contenido.exp === 'number' ? contenido.exp * 1000 : null
  } catch {
    return null
  }
}

export function crearSesion(api: SesionApi): Sesion | null {
  const expira = expiracionDelToken(api.accessToken)
  if (expira === null) {
    return null
  }
  return {
    token: api.accessToken,
    usuario: api.usuario,
    nombre: api.nombre,
    rol: api.rol,
    expira,
  }
}

export function guardarSesion(sesion: Sesion): void {
  sessionStorage.setItem(CLAVE, JSON.stringify(sesion))
}

export function leerSesion(ahora: number = Date.now()): Sesion | null {
  const guardada = sessionStorage.getItem(CLAVE)
  if (!guardada) {
    return null
  }
  try {
    const sesion = JSON.parse(guardada) as Sesion
    if (typeof sesion.token !== 'string' || !(sesion.expira > ahora)) {
      borrarSesion()
      return null
    }
    return sesion
  } catch {
    borrarSesion()
    return null
  }
}

export function borrarSesion(): void {
  sessionStorage.removeItem(CLAVE)
}
