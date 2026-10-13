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

// Simula los endpoints de prospectos de ventascrm con las mismas reglas que el
// backend, para las pruebas y para `npm run dev` sin backend.

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
    if (datos.telefono && !/^\d{10}$/.test(datos.telefono)) {
      return apiError(
        400,
        'Bad Request',
        'El teléfono debe tener 10 dígitos',
        URL_PROSPECTOS,
      )
    }

    // Decisión del PO: un contacto repetido no bloquea; solo se avisa.
    const contactoRepetido = todosLosProspectos().some(
      (p) =>
        (datos.telefono && p.telefono === datos.telefono) ||
        (datos.correo && p.correo === datos.correo),
    )

    const prospecto = agregarProspecto({
      nombre: datos.nombre.trim(),
      telefono: datos.telefono ?? null,
      correo: datos.correo ?? null,
      etapa: 'PRIMER_CONTACTO',
      // El prospecto queda asignado a quien lo registra.
      vendedorId: actorDe(request)?.uid ?? 1,
      creadoEn: new Date().toISOString(),
    })
    return HttpResponse.json(
      { ...prospecto, contactoRepetido },
      { status: 201 },
    )
  }),

  http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ params, request }) => {
    const ruta = `${URL_PROSPECTOS}/${params.id}/etapa`
    // Decisión del PO: solo el vendedor cambia la etapa.
    const actor = actorDe(request)
    if (actor && !actor.roles.includes('VENTAS')) {
      return apiError(
        403,
        'Forbidden',
        'No tienes permiso para esta operación',
        ruta,
      )
    }
    const prospecto = buscarProspecto(Number(params.id))
    if (!prospecto) {
      return apiError(404, 'Not Found', 'Prospecto no encontrado', ruta)
    }

    const { etapa, motivoCierre } = (await request.json()) as {
      etapa?: unknown
      motivoCierre?: unknown
    }
    if (!esEtapa(etapa)) {
      return apiError(400, 'Bad Request', 'Etapa no válida', ruta)
    }
    if (etapa === prospecto.etapa) {
      return HttpResponse.json(prospecto)
    }
    if (etapa === 'CERRADO') {
      const motivo = typeof motivoCierre === 'string' ? motivoCierre.trim() : ''
      if (!motivo) {
        return apiError(
          400,
          'Bad Request',
          'El motivo de cierre es obligatorio',
          ruta,
        )
      }
      prospecto.motivoCierre = motivo
      prospecto.ultimaEtapa = prospecto.etapa
    } else if (prospecto.etapa === 'CERRADO') {
      prospecto.motivoCierre = null
      prospecto.ultimaEtapa = null
    }

    prospecto.etapa = etapa
    return HttpResponse.json(prospecto)
  }),
]
