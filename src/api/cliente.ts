// Cliente HTTP mínimo para la API de Agencia360. Los errores de la API llegan
// con el formato ApiError del backend: { timestamp, status, error, message, path }.
import { leerSesion } from '../sesion/almacen.ts'

// Sin VITE_API_URL las rutas son relativas (/api/...): en desarrollo las
// atiende MSW o el proxy de Vite hacia el backend local (ver vite.config.ts).
export const API_URL: string = import.meta.env.VITE_API_URL ?? ''

/** Evento que avisa que el backend rechazó el token de la sesión (401). */
export const EVENTO_SESION_EXPIRADA = 'agencia360:sesion-expirada'

export class ErrorApi extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ErrorApi'
    this.status = status
  }
}

/**
 * fetch hacia la API con el token de la sesión guardada. Si había sesión y el
 * backend responde 401, avisa con EVENTO_SESION_EXPIRADA para cerrarla.
 */
export async function fetchApi(
  ruta: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = leerSesion()?.token
  const encabezados = new Headers(init.headers)
  if (token) {
    encabezados.set('Authorization', `Bearer ${token}`)
  }
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...init,
    headers: encabezados,
  })
  if (token && respuesta.status === 401) {
    window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA))
  }
  return respuesta
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH'

interface OpcionesPeticion {
  metodo?: Metodo
  cuerpo?: unknown
}

const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Intenta de nuevo.'
const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor.'

/** Petición JSON: devuelve el cuerpo o lanza ErrorApi con el mensaje del backend. */
export async function peticion<T>(
  ruta: string,
  { metodo = 'GET', cuerpo }: OpcionesPeticion = {},
): Promise<T> {
  const encabezados: Record<string, string> = { Accept: 'application/json' }
  if (cuerpo !== undefined) {
    encabezados['Content-Type'] = 'application/json'
  }

  let respuesta: Response
  try {
    respuesta = await fetchApi(ruta, {
      method: metodo,
      headers: encabezados,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorApi(0, MENSAJE_SIN_CONEXION)
  }

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await leerMensaje(respuesta))
  }
  return (await respuesta.json()) as T
}

async function leerMensaje(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { message?: unknown }
    if (typeof cuerpo.message === 'string' && cuerpo.message.length > 0) {
      return cuerpo.message
    }
  } catch {
    // La respuesta no trae un cuerpo JSON: se usa el mensaje genérico.
  }
  return MENSAJE_GENERICO
}

export function mensajeDeError(error: unknown): string {
  return error instanceof ErrorApi ? error.message : MENSAJE_GENERICO
}
