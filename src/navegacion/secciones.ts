// Secciones del CRM y los roles que pueden entrar a cada una, según la matriz
// de roles. Cada pantalla nueva del CRM agrega aquí su sección; con eso aparece
// en el menú lateral y su ruta queda protegida.
import { Contact, UserCog, UserPlus, Users, type LucideIcon } from 'lucide-react'
import type { Rol } from '../api/acceso.ts'

/** Grupos del menú lateral, en el orden en que se muestran. */
export const GRUPOS = ['Ventas', 'Administración'] as const

export type Grupo = (typeof GRUPOS)[number]

export interface Seccion {
  ruta: string
  titulo: string
  grupo: Grupo
  /** Ícono de Lucide (guía de estilos, sección 7). */
  icono: LucideIcon
  roles: Rol[]
}

export const SECCIONES: Seccion[] = [
  {
    ruta: '/prospectos',
    titulo: 'Prospectos',
    grupo: 'Ventas',
    icono: Users,
    roles: ['VENTAS', 'GERENTE_MARKETING'],
  },
  {
    ruta: '/registrar',
    titulo: 'Registrar',
    grupo: 'Ventas',
    icono: UserPlus,
    roles: ['VENTAS'],
  },
  {
    ruta: '/clientes',
    titulo: 'Clientes',
    grupo: 'Ventas',
    icono: Contact,
    roles: ['GERENTE_MARKETING'],
  },
  {
    ruta: '/usuarios',
    titulo: 'Usuarios',
    grupo: 'Administración',
    icono: UserCog,
    roles: ['GERENTE_MARKETING'],
  },
]

export function seccionesPara(rol: Rol): Seccion[] {
  return SECCIONES.filter((seccion) => seccion.roles.includes(rol))
}

export function rolesDe(ruta: string): Rol[] {
  return SECCIONES.find((seccion) => seccion.ruta === ruta)?.roles ?? []
}

/** Sección a la que pertenece una ruta, incluidas sus subrutas. */
export function seccionDe(ruta: string): Seccion | undefined {
  return SECCIONES.find(
    (seccion) => ruta === seccion.ruta || ruta.startsWith(`${seccion.ruta}/`),
  )
}
