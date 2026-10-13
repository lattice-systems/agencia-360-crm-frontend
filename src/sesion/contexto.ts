import { createContext } from 'react'
import type { SesionApi } from '../api/acceso.ts'
import type { Sesion } from './almacen.ts'

export type MotivoCierre = 'manual' | 'expirada'

export interface ValorSesion {
  sesion: Sesion | null
  /** Aviso para la pantalla de login, por ejemplo cuando la sesión expiró. */
  aviso: string | null
  iniciar: (api: SesionApi) => boolean
  cerrar: (motivo?: MotivoCierre) => void
}

export const ContextoSesion = createContext<ValorSesion | null>(null)
