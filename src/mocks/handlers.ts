import { http, HttpResponse } from 'msw'
import { URL_PROSPECTOS } from '../prospectos/api.ts'
import { ETAPAS, type Etapa, type ProspectoNuevo } from '../prospectos/tipos.ts'
import {
  agregarProspecto,
  buscarProspecto,
  todosLosProspectos,
} from './datos.ts'
import { actorDe, handlersAcceso } from './acceso.ts'
import { handlersReasignacion } from './reasignacion.ts'

// Simula el backend mientras los endpoints de prospectos no existen.
// Sigue el borrador de contrato de Coper (Sprints/borradores-coper).

function apiError(
  status: number,
  error: string,
  message: string,
  path: string,
) {
  return HttpResponse.json(
    { timestamp: new Date().toISOString(), status, error, message, path },
    { status },
  )
}

function esEtapa(valor: unknown): valor is Etapa {
  return typeof valor === 'string' && ETAPAS.includes(valor as Etapa)
}

export const handlers = [
  ...handlersAcceso,
  ...handlersReasignacion,

  http.get(URL_PROSPECTOS, ({ request }) => {
    const etapa = new URL(request.url).searchParams.get('etapa')
    if (etapa !== null && !esEtapa(etapa)) {
      return apiError(400, 'Bad Request', 'Etapa no válida', URL_PROSPECTOS)
    }
    // CRM-0.1: con sesión de VENTAS solo salen sus prospectos; el gerente ve todos.
    const actor = actorDe(request)
    const soloSuyos = actor?.roles.includes('VENTAS') ?? false
    const lista = todosLosProspectos().filter(
      (p) =>
        (etapa === null || p.etapa === etapa) &&
        (!soloSuyos || p.vendedorId === actor?.uid),
    )
    return HttpResponse.json(lista)
  }),

  http.post(URL_PROSPECTOS, async ({ request }) => {
    const datos = (await request.json()) as ProspectoNuevo

    if (!datos.nombre?.trim() || (!datos.telefono && !datos.correo)) {
      return apiError(
        400,
        'Bad Request',
        'El nombre y un teléfono o correo son obligatorios',
        URL_PROSPECTOS,
      )
    }

    // PENDIENTE P1: se simula que el duplicado bloquea con 409.
    const repetido = todosLosProspectos().some(
      (p) =>
        (datos.telefono && p.telefono === datos.telefono) ||
        (datos.correo && p.correo === datos.correo),
    )
    if (repetido) {
      return apiError(
        409,
        'Conflict',
        'Ya existe un prospecto con ese teléfono o correo',
        URL_PROSPECTOS,
      )
    }

    const prospecto = agregarProspecto({
      nombre: datos.nombre.trim(),
      telefono: datos.telefono ?? null,
      correo: datos.correo ?? null,
      etapa: 'PRIMER_CONTACTO',
      // El prospecto queda asignado a quien lo registra.
      vendedorId: actorDe(request)?.uid ?? 1,
      creadoEn: new Date().toISOString(),
    })
    return HttpResponse.json(prospecto, { status: 201 })
  }),

  http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ params, request }) => {
    const ruta = `${URL_PROSPECTOS}/${params.id}/etapa`
    const prospecto = buscarProspecto(Number(params.id))
    if (!prospecto) {
      return apiError(404, 'Not Found', 'Prospecto no encontrado', ruta)
    }

    const { etapa } = (await request.json()) as { etapa?: unknown }
    if (!esEtapa(etapa)) {
      return apiError(400, 'Bad Request', 'Etapa no válida', ruta)
    }

    prospecto.etapa = etapa
    return HttpResponse.json(prospecto)
  }),
]
