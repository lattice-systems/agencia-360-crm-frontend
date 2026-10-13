import { fetchApi } from '../api/cliente.ts'
import type { Etapa, Prospecto, ProspectoNuevo } from './tipos.ts'

// PROPUESTA: la ruta todavía no está definida en el backend.
// Sale del borrador de prospectos de Coper (/api/v1/prospectos).
export const URL_PROSPECTOS = '/api/v1/prospectos'

const CABECERAS_JSON = { 'Content-Type': 'application/json' }

export type ResultadoRegistro =
  | { tipo: 'creado'; prospecto: Prospecto }
  | { tipo: 'duplicado' }
  | { tipo: 'error' }

export async function registrarProspecto(
  datos: ProspectoNuevo,
): Promise<ResultadoRegistro> {
  try {
    const respuesta = await fetchApi(URL_PROSPECTOS, {
      method: 'POST',
      headers: CABECERAS_JSON,
      body: JSON.stringify(datos),
    })

    if (respuesta.status === 201) {
      return { tipo: 'creado', prospecto: (await respuesta.json()) as Prospecto }
    }
    // PENDIENTE P1: falta que el PO diga si el duplicado bloquea o solo avisa.
    // Por ahora se asume que el backend responde 409.
    if (respuesta.status === 409) {
      return { tipo: 'duplicado' }
    }
    return { tipo: 'error' }
  } catch {
    return { tipo: 'error' }
  }
}

// CRM-1.1: el servidor solo devuelve los prospectos que el usuario puede ver.
export async function listarProspectos(
  etapa?: Etapa,
  signal?: AbortSignal,
): Promise<Prospecto[]> {
  const url = etapa
    ? `${URL_PROSPECTOS}?${new URLSearchParams({ etapa })}`
    : URL_PROSPECTOS
  const respuesta = await fetchApi(url, { signal })
  if (!respuesta.ok) {
    throw new Error(`No se pudo listar prospectos (HTTP ${respuesta.status})`)
  }
  return (await respuesta.json()) as Prospecto[]
}

// CRM-1.1: el servidor registra el cambio con fecha y hora en el historial.
export async function cambiarEtapa(
  id: number,
  etapa: Etapa,
): Promise<Prospecto> {
  const respuesta = await fetchApi(`${URL_PROSPECTOS}/${id}/etapa`, {
    method: 'PATCH',
    headers: CABECERAS_JSON,
    body: JSON.stringify({ etapa }),
  })
  if (!respuesta.ok) {
    throw new Error(`No se pudo cambiar la etapa (HTTP ${respuesta.status})`)
  }
  return (await respuesta.json()) as Prospecto
}
