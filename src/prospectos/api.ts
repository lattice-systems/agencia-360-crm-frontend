import { fetchApi } from '../api/cliente.ts'
import type { Etapa, Prospecto, ProspectoNuevo } from './tipos.ts'

// Endpoints de ventascrm en el backend (CRM-1.0 y CRM-1.1).
export const URL_PROSPECTOS = '/api/v1/prospectos'

const CABECERAS_JSON = { 'Content-Type': 'application/json' }

export type ResultadoRegistro =
  | { tipo: 'creado'; prospecto: Prospecto; contactoRepetido: boolean }
  | { tipo: 'invalido'; mensaje: string }
  | { tipo: 'error' }

const MENSAJE_INVALIDO = 'Revisa los datos del prospecto.'

async function mensajeDe(respuesta: Response): Promise<string> {
  try {
    const { message } = (await respuesta.json()) as { message?: unknown }
    return typeof message === 'string' && message ? message : MENSAJE_INVALIDO
  } catch {
    return MENSAJE_INVALIDO
  }
}

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
      // Decisión del PO: un teléfono o correo repetido no bloquea; el backend
      // registra y solo avisa con contactoRepetido.
      const { contactoRepetido, ...prospecto } =
        (await respuesta.json()) as Prospecto & { contactoRepetido: boolean }
      return { tipo: 'creado', prospecto, contactoRepetido }
    }
    if (respuesta.status === 400) {
      return { tipo: 'invalido', mensaje: await mensajeDe(respuesta) }
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
// Para pasar a Cerrado el motivo es obligatorio (decisión del PO).
export async function cambiarEtapa(
  id: number,
  etapa: Etapa,
  motivoCierre?: string,
): Promise<Prospecto> {
  const respuesta = await fetchApi(`${URL_PROSPECTOS}/${id}/etapa`, {
    method: 'PATCH',
    headers: CABECERAS_JSON,
    body: JSON.stringify(
      motivoCierre === undefined ? { etapa } : { etapa, motivoCierre },
    ),
  })
  if (!respuesta.ok) {
    throw new Error(`No se pudo cambiar la etapa (HTTP ${respuesta.status})`)
  }
  return (await respuesta.json()) as Prospecto
}
