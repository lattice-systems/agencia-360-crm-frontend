// Secciones del CRM y los roles que pueden entrar a cada una, según la matriz
// de roles. Cada pantalla nueva del CRM agrega aquí su sección; con eso aparece
// en el menú lateral y su ruta queda protegida.
import { BadgeCheck, Contact, UserCog, Users, type LucideIcon } from 'lucide-react'
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
  /**
   * Para las migas de pan: sección de la que depende aunque tenga su propia
   * entrada en el menú, y cómo se llama ahí (Prospectos / Registrar prospecto).
   */
  padre?: string
  tituloEnMigas?: string
  /** Páginas dentro de la sección, para las migas de pan (ruta con :parámetros). */
  subpaginas?: { ruta: string; titulo: string }[]
}

export const SECCIONES: Seccion[] = [
  {
    ruta: '/prospectos',
    titulo: 'Prospectos',
    grupo: 'Ventas',
    icono: Users,
    roles: ['VENTAS', 'GERENTE_MARKETING'],
    // Registrar no va en el menú: se entra con el botón de Prospectos.
    subpaginas: [{ ruta: '/prospectos/registrar', titulo: 'Registrar prospecto' }],
  },
  {
    ruta: '/finalizados',
    titulo: 'Finalizados',
    grupo: 'Ventas',
    icono: BadgeCheck,
    roles: ['VENTAS', 'GERENTE_MARKETING'],
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

/**
 * Registrar prospecto no va en el menú: se entra con el botón de Prospectos y
 * vive bajo su ruta. Solo lo hace Ventas.
 */
export const RUTA_REGISTRAR = '/prospectos/registrar'
export const ROLES_REGISTRAR: Rol[] = ['VENTAS']

export function rolesDe(ruta: string): Rol[] {
  return SECCIONES.find((seccion) => seccion.ruta === ruta)?.roles ?? []
}

/** Sección a la que pertenece una ruta, incluidas sus subrutas. */
export function seccionDe(ruta: string): Seccion | undefined {
  return SECCIONES.find(
    (seccion) => ruta === seccion.ruta || ruta.startsWith(`${seccion.ruta}/`),
  )
}
