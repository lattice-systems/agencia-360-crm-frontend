import { http, HttpResponse } from 'msw'
import { URL_PROSPECTOS } from '../prospectos/api.ts'
import { actorDe, buscarUsuario } from './acceso.ts'
import { buscarProspecto } from './datos.ts'

// Simula PUT /api/v1/prospectos/{id}/vendedor (CRM-0.1) con las mismas reglas
// que el backend: solo el gerente, 404 si no existe, 400 si no es vendedor activo.

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

export const handlersReasignacion = [
  http.put(`${URL_PROSPECTOS}/:id/vendedor`, async ({ params, request }) => {
    const ruta = `${URL_PROSPECTOS}/${params.id}/vendedor`
    const actor = actorDe(request)
    if (!actor) {
      return apiError(401, 'Unauthorized', 'Inicia sesión para continuar', ruta)
    }
    if (!actor.roles.includes('GERENTE_MARKETING')) {
      return apiError(
        403,
        'Forbidden',
        'Solo el Gerente de marketing reasigna prospectos',
        ruta,
      )
    }
    const prospecto = buscarProspecto(Number(params.id))
    if (!prospecto) {
      return apiError(
        404,
        'Not Found',
        `No existe el prospecto ${params.id}`,
        ruta,
      )
    }
    const { vendedorId } = (await request.json()) as { vendedorId?: number }
    const vendedor =
      vendedorId === undefined ? undefined : buscarUsuario(vendedorId)
    if (!vendedor || vendedor.rol !== 'VENTAS' || !vendedor.activo) {
      return apiError(
        400,
        'Bad Request',
        `El usuario ${vendedorId} no es un vendedor activo`,
        ruta,
      )
    }
    prospecto.vendedorId = vendedor.id
    return HttpResponse.json(prospecto)
  }),
]
