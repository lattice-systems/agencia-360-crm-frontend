import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SesionApi } from '../api/acceso.ts'
import { EVENTO_SESION_EXPIRADA } from '../api/cliente.ts'
import {
  borrarSesion,
  crearSesion,
  guardarSesion,
  leerSesion,
  type Sesion,
} from './almacen.ts'
import {
  ContextoSesion,
  type MotivoCierre,
  type ValorSesion,
} from './contexto.ts'

const AVISO_EXPIRADA = 'Tu sesión expiró. Inicia sesión de nuevo.'

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => leerSesion())
  const [aviso, setAviso] = useState<string | null>(null)

  const cerrar = useCallback((motivo: MotivoCierre = 'manual') => {
    borrarSesion()
    setSesion(null)
    setAviso(motivo === 'expirada' ? AVISO_EXPIRADA : null)
  }, [])

  const iniciar = useCallback((api: SesionApi) => {
    const nueva = crearSesion(api)
    if (!nueva) {
      return false
    }
    guardarSesion(nueva)
    setSesion(nueva)
    setAviso(null)
    return true
  }, [])

  // Cierra la sesión en el momento en que vence el token.
  useEffect(() => {
    if (!sesion) {
      return
    }
    const restante = Math.max(sesion.expira - Date.now(), 0)
    const temporizador = window.setTimeout(() => cerrar('expirada'), restante)
    return () => window.clearTimeout(temporizador)
  }, [sesion, cerrar])

  // Cierra la sesión si el backend rechaza el token en cualquier petición.
  useEffect(() => {
    const alExpirar = () => cerrar('expirada')
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar)
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar)
  }, [cerrar])

  const valor = useMemo<ValorSesion>(
    () => ({ sesion, aviso, iniciar, cerrar }),
    [sesion, aviso, iniciar, cerrar],
  )

  return (
    <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
  )
}
