// Secciones del CRM y los roles que pueden entrar a cada una, según la matriz
// de roles. Cada pantalla nueva del CRM agrega aquí su sección.
import type { Rol } from '../api/acceso.ts'

export interface Seccion {
  ruta: string
  titulo: string
  roles: Rol[]
}

export const SECCIONES: Seccion[] = [
  {
    ruta: '/prospectos',
    titulo: 'Prospectos',
    roles: ['VENTAS', 'GERENTE_MARKETING'],
  },
  { ruta: '/registrar', titulo: 'Registrar', roles: ['VENTAS'] },
  { ruta: '/usuarios', titulo: 'Usuarios', roles: ['GERENTE_MARKETING'] },
]

export function seccionesPara(rol: Rol): Seccion[] {
  return SECCIONES.filter((seccion) => seccion.roles.includes(rol))
}

export function rolesDe(ruta: string): Rol[] {
  return SECCIONES.find((seccion) => seccion.ruta === ruta)?.roles ?? []
}
