import { useCallback, useEffect, useState } from 'react'
import { ErrorApi, mensajeDeError } from './cliente.ts'

interface EstadoConsulta<T> {
  datos: T | null
  error: string | null
  cargando: boolean
}

/**
 * Carga datos de la API. El token lo agrega el cliente; si el backend responde
 * 401, el cliente cierra la sesión y aquí no se muestra el error.
 *
 * @param consulta función estable (fuera del componente o con useCallback)
 */
export function useConsulta<T>(consulta: () => Promise<T>) {
  const [estado, setEstado] = useState<EstadoConsulta<T>>({
    datos: null,
    error: null,
    cargando: true,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    consulta()
      .then((datos) => {
        if (vigente) {
          setEstado({ datos, error: null, cargando: false })
        }
      })
      .catch((e: unknown) => {
        if (vigente && !esSesionVencida(e)) {
          setEstado({ datos: null, error: mensajeDeError(e), cargando: false })
        }
      })
    return () => {
      vigente = false
    }
  }, [consulta, version])

  const recargar = useCallback(() => {
    setEstado((actual) => ({ ...actual, error: null, cargando: true }))
    setVersion((v) => v + 1)
  }, [])

  /** Reemplaza los datos sin volver a pedirlos, por ejemplo tras guardar. */
  const actualizar = useCallback((cambio: (actuales: T | null) => T) => {
    setEstado((actual) => ({ ...actual, datos: cambio(actual.datos) }))
  }, [])

  return { ...estado, recargar, actualizar }
}

function esSesionVencida(e: unknown): boolean {
  return e instanceof ErrorApi && e.status === 401
}

/**
 * Para acciones que guardan: devuelve el mensaje del error de la API, o null
 * si el token venció (el cliente ya cerró la sesión).
 */
export function useMensajeDeError() {
  return useCallback(
    (e: unknown): string | null => (esSesionVencida(e) ? null : mensajeDeError(e)),
    [],
  )
}
