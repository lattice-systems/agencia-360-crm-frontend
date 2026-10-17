import { http, HttpResponse } from 'msw'
import {
  URL_CLIENTES,
  type ClienteDetalle,
  type ClienteResumen,
} from '../clientes/api.ts'
import { actorDe } from './acceso.ts'

// Simula el módulo clientes del backend (CRM-1.5) para las pruebas y para
// `npm run dev` sin backend. Solo responde al Gerente de marketing.

const CLIENTES_INICIALES: readonly ClienteDetalle[] = [
  {
    id: 1,
    nombre: 'Ana López',
    correo: 'ana.lopez@ejemplo.com',
    telefono: '4775550101',
    creadoEn: '2026-10-10T16:30:00Z',
    vehiculos: [
      {
        id: 1,
        vin: '3VWFE21C04M000001',
        modelo: 'Jetta',
        anio: 2026,
        placas: null,
        kilometraje: null,
      },
      {
        id: 2,
        vin: '3VWFE21C04M000002',
        modelo: 'Tiguan',
        anio: 2025,
        placas: 'GTO-123-A',
        kilometraje: 15200,
      },
    ],
  },
  {
    id: 2,
    nombre: 'Bruno Díaz',
    correo: null,
    telefono: '4775550102',
    creadoEn: '2026-10-12T18:05:00Z',
    vehiculos: [
      {
        id: 3,
        vin: '3VWFE21C04M000003',
        modelo: 'Taos',
        anio: 2026,
        placas: null,
        kilometraje: null,
      },
    ],
  },
]

let clientes: ClienteDetalle[] = []

export function reiniciarClientes(iniciales = CLIENTES_INICIALES) {
  clientes = iniciales.map((c) => ({
    ...c,
    vehiculos: c.vehiculos.map((v) => ({ ...v })),
  }))
}

function apiError(status: number, error: string, message: string, path: string) {
  return HttpResponse.json(
    { timestamp: new Date().toISOString(), status, error, message, path },
    { status },
  )
}

function soloGerente(request: Request, ruta: string) {
  const actor = actorDe(request)
  if (!actor) {
    return apiError(401, 'Unauthorized', 'Se requiere iniciar sesión', ruta)
  }
  if (!actor.roles.includes('GERENTE_MARKETING')) {
    return apiError(403, 'Forbidden', 'No tienes permiso para esta operación', ruta)
  }
  return null
}

const resumen = (c: ClienteDetalle): ClienteResumen => ({
  id: c.id,
  nombre: c.nombre,
  correo: c.correo,
  telefono: c.telefono,
  vehiculos: c.vehiculos.length,
  creadoEn: c.creadoEn,
})

export const handlersClientes = [
  http.get(URL_CLIENTES, ({ request }) => {
    const rechazo = soloGerente(request, URL_CLIENTES)
    if (rechazo) return rechazo
    const ordenados = [...clientes].sort((a, b) => a.nombre.localeCompare(b.nombre))
    return HttpResponse.json(ordenados.map(resumen))
  }),

  http.get(`${URL_CLIENTES}/:id`, ({ params, request }) => {
    const ruta = `${URL_CLIENTES}/${params.id}`
    const rechazo = soloGerente(request, ruta)
    if (rechazo) return rechazo
    const cliente = clientes.find((c) => c.id === Number(params.id))
    return cliente
      ? HttpResponse.json(cliente)
      : apiError(404, 'Not Found', `No existe el cliente ${params.id}`, ruta)
  }),
]

reiniciarClientes()
