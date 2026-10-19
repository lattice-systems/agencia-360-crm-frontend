import { http, HttpResponse } from 'msw'
import {
  URL_CLIENTES,
  type ClienteDetalle,
  type ClienteNuevo,
  type ClienteResumen,
  type CuentaApp,
  type VehiculoNuevo,
} from '../clientes/api.ts'
import { actorDe } from './acceso.ts'

// Simula el módulo clientes y las cuentas de la app del backend (CRM-1.5 y
// CRM-1.3) para las pruebas y para `npm run dev` sin backend. Solo responde al
// Gerente de marketing.

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

/** Ana ya tiene cuenta activa; Bruno no tiene correo, así que no puede tenerla. */
const CUENTAS_INICIALES: readonly CuentaApp[] = [
  { clienteId: 1, estado: 'ACTIVA', debeCambiarContrasena: false },
]

let clientes: ClienteDetalle[] = []
let cuentas: CuentaApp[] = []

export function reiniciarClientes(
  iniciales = CLIENTES_INICIALES,
  cuentasIniciales = CUENTAS_INICIALES,
) {
  clientes = iniciales.map((c) => ({
    ...c,
    vehiculos: c.vehiculos.map((v) => ({ ...v })),
  }))
  cuentas = cuentasIniciales.map((c) => ({ ...c }))
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

const cuentaDe = (clienteId: number): CuentaApp =>
  cuentas.find((c) => c.clienteId === clienteId) ?? {
    clienteId,
    estado: 'SIN_CUENTA',
    debeCambiarContrasena: false,
  }

const siguienteId = (ids: number[]) => Math.max(0, ...ids) + 1

export const handlersClientes = [
  http.get(URL_CLIENTES, ({ request }) => {
    const rechazo = soloGerente(request, URL_CLIENTES)
    if (rechazo) return rechazo
    const ordenados = [...clientes].sort((a, b) => a.nombre.localeCompare(b.nombre))
    return HttpResponse.json(ordenados.map(resumen))
  }),

  http.post(URL_CLIENTES, async ({ request }) => {
    const rechazo = soloGerente(request, URL_CLIENTES)
    if (rechazo) return rechazo
    const nuevo = (await request.json()) as ClienteNuevo
    const correo = nuevo.correo?.trim().toLowerCase() || null
    if (correo && clientes.some((c) => c.correo === correo)) {
      return apiError(409, 'Conflict', `Ya existe un cliente con el correo ${correo}`, URL_CLIENTES)
    }
    const creado: ClienteDetalle = {
      id: siguienteId(clientes.map((c) => c.id)),
      nombre: nuevo.nombre.trim(),
      correo,
      telefono: nuevo.telefono || null,
      creadoEn: new Date().toISOString(),
      vehiculos: [],
    }
    clientes.push(creado)
    return HttpResponse.json(creado, { status: 201 })
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

  http.post(`${URL_CLIENTES}/:id/vehiculos`, async ({ params, request }) => {
    const ruta = `${URL_CLIENTES}/${params.id}/vehiculos`
    const rechazo = soloGerente(request, ruta)
    if (rechazo) return rechazo
    const cliente = clientes.find((c) => c.id === Number(params.id))
    if (!cliente) {
      return apiError(404, 'Not Found', `No existe el cliente ${params.id}`, ruta)
    }
    const vehiculo = (await request.json()) as VehiculoNuevo
    const vin = vehiculo.vin.trim().toUpperCase()
    const dueno = clientes.find((c) => c.vehiculos.some((v) => v.vin === vin))
    if (dueno && dueno.id !== cliente.id) {
      return apiError(409, 'Conflict', `El vehículo con VIN ${vin} ya es de otro cliente`, ruta)
    }
    if (!dueno) {
      cliente.vehiculos.push({
        id: siguienteId(clientes.flatMap((c) => c.vehiculos.map((v) => v.id))),
        vin,
        modelo: vehiculo.modelo.trim(),
        anio: vehiculo.anio,
        placas: null,
        kilometraje: null,
      })
    }
    return HttpResponse.json(cliente)
  }),

  http.get(`${URL_CLIENTES}/:id/cuenta-app`, ({ params, request }) => {
    const rechazo = soloGerente(request, `${URL_CLIENTES}/${params.id}/cuenta-app`)
    return rechazo ?? HttpResponse.json(cuentaDe(Number(params.id)))
  }),

  http.post(`${URL_CLIENTES}/:id/cuenta-app`, ({ params, request }) => {
    const ruta = `${URL_CLIENTES}/${params.id}/cuenta-app`
    const rechazo = soloGerente(request, ruta)
    if (rechazo) return rechazo
    const id = Number(params.id)
    const cliente = clientes.find((c) => c.id === id)
    if (!cliente) {
      return apiError(404, 'Not Found', `No existe el cliente ${id}`, ruta)
    }
    if (!cliente.correo) {
      return apiError(409, 'Conflict', 'El cliente no tiene correo para entrar a la app', ruta)
    }
    if (cuentaDe(id).estado !== 'SIN_CUENTA') {
      return apiError(409, 'Conflict', 'El cliente ya tiene cuenta en la app', ruta)
    }
    const cuenta: CuentaApp = { clienteId: id, estado: 'ACTIVA', debeCambiarContrasena: true }
    cuentas.push(cuenta)
    return HttpResponse.json(cuenta, { status: 201 })
  }),

  http.post(`${URL_CLIENTES}/:id/cuenta-app/:accion`, ({ params, request }) => {
    const ruta = `${URL_CLIENTES}/${params.id}/cuenta-app/${params.accion}`
    const rechazo = soloGerente(request, ruta)
    if (rechazo) return rechazo
    const cuenta = cuentas.find((c) => c.clienteId === Number(params.id))
    if (!cuenta) {
      return apiError(404, 'Not Found', 'El cliente no tiene cuenta en la app', ruta)
    }
    cuenta.estado = params.accion === 'desactivar' ? 'DESACTIVADA' : 'ACTIVA'
    return HttpResponse.json(cuenta)
  }),
]

reiniciarClientes()
