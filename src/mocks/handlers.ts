import { http, HttpResponse } from 'msw'
import { URL_PROSPECTOS } from '../prospectos/api.ts'
import { esquemaDatosFiscales, REGIMENES_FISCALES } from '../prospectos/datosFiscales.ts'
import {
  esEtapaInicial,
  estaEnProcesoDeVenta,
  MOTIVOS_CIERRE,
  ETAPAS,
  type Etapa,
  type Prospecto,
  type ProspectoNuevo,
} from '../prospectos/tipos.ts'
import {
  agregarProspecto,
  buscarProspecto,
  historialDe,
  moverProspecto,
  todosLosProspectos,
} from './datos.ts'
import { actorDe, buscarUsuario, handlersAcceso, type ActorMock } from './acceso.ts'
import { handlersClientes } from './clientes.ts'
import { handlersReasignacion } from './reasignacion.ts'

// Simula los endpoints de prospectos de ventascrm con las mismas reglas que el
// backend, para las pruebas y para `npm run dev` sin backend.

function apiError(status: number, error: string, message: string, path: string) {
  return HttpResponse.json(
    { timestamp: new Date().toISOString(), status, error, message, path },
    { status },
  )
}

function esEtapa(valor: unknown): valor is Etapa {
  return typeof valor === 'string' && ETAPAS.includes(valor as Etapa)
}

const esVendedor = (actor: ActorMock | null) => actor?.roles.includes('VENTAS') ?? false

/** Prospecto visible para el actor: el vendedor solo ve los suyos. */
function visible(id: number, actor: ActorMock | null): Prospecto | undefined {
  const prospecto = buscarProspecto(id)
  return prospecto && (!esVendedor(actor) || prospecto.vendedorId === actor?.uid)
    ? prospecto
    : undefined
}

const nombreDe = (actor: ActorMock | null) =>
  (actor && buscarUsuario(actor.uid)?.nombre) ?? null

/** Uno de los tres motivos de cierre que fijó el PO (CRM-1.2). */
function esMotivoCierre(valor: unknown): valor is (typeof MOTIVOS_CIERRE)[number] {
  return (MOTIVOS_CIERRE as readonly unknown[]).includes(valor)
}

/** Motivo de bloqueo cuando el vendedor intenta un cambio que no le toca. */
function bloqueoDelVendedor(actual: Etapa, nueva: Etapa): string | null {
  if (esEtapaInicial(actual)) {
    return esEtapaInicial(nueva) || nueva === 'PAGO' || nueva === 'CERRADO'
      ? null
      : 'Solo puedes pasar a Primer contacto, Visita, Cotización, Pago o Cerrado'
  }
  if (actual === 'ENTREGA' && nueva === 'FINALIZADO') return null
  if (estaEnProcesoDeVenta(actual) && nueva === 'CERRADO') {
    return 'Para cerrar este prospecto envía una solicitud de cierre al Administrador'
  }
  if (actual === 'PAGO') return 'En Pago el prospecto avanza cuando Contabilidad valida el pago'
  if (actual === 'FACTURACION') {
    return 'En Facturación el prospecto avanza cuando Facturación emite la factura'
  }
  if (actual === 'ENTREGA') return 'Desde Entrega solo puedes finalizar el prospecto'
  return actual === 'FINALIZADO' ? 'El prospecto ya está finalizado' : 'El prospecto ya está cerrado'
}

export const handlers = [
  ...handlersAcceso,
  ...handlersReasignacion,
  ...handlersClientes,

  http.get(URL_PROSPECTOS, ({ request }) => {
    const etapa = new URL(request.url).searchParams.get('etapa')
    if (etapa !== null && !esEtapa(etapa)) {
      return apiError(400, 'Bad Request', 'Etapa no válida', URL_PROSPECTOS)
    }
    // CRM-0.1: con sesión de VENTAS solo salen sus prospectos; el gerente ve todos.
    const actor = actorDe(request)
    const lista = todosLosProspectos().filter(
      (p) =>
        (etapa === null || p.etapa === etapa) &&
        (!esVendedor(actor) || p.vendedorId === actor?.uid),
    )
    return HttpResponse.json(lista)
  }),

  http.get(`${URL_PROSPECTOS}/coincidencias`, ({ request }) => {
    const parametros = new URL(request.url).searchParams
    const telefono = parametros.get('telefono')
    const correo = parametros.get('correo')?.toLowerCase()
    const contactoRepetido = todosLosProspectos().some(
      (p) => (telefono && p.telefono === telefono) || (correo && p.correo === correo),
    )
    return HttpResponse.json({ contactoRepetido })
  }),

  http.get(`${URL_PROSPECTOS}/:id/historial`, ({ params, request }) => {
    const prospecto = visible(Number(params.id), actorDe(request))
    if (!prospecto) {
      return apiError(404, 'Not Found', `No existe el prospecto ${params.id}`, '')
    }
    return HttpResponse.json(historialDe(prospecto.id))
  }),

  http.post(URL_PROSPECTOS, async ({ request }) => {
    const datos = (await request.json()) as ProspectoNuevo
    if (!datos.nombre?.trim() || (!datos.telefono && !datos.correo)) {
      return apiError(400, 'Bad Request', 'Captura al menos un teléfono o un correo', URL_PROSPECTOS)
    }
    if (datos.telefono && !/^\d{10}$/.test(datos.telefono)) {
      return apiError(400, 'Bad Request', 'El teléfono debe tener 10 dígitos', URL_PROSPECTOS)
    }
    const correo = datos.correo?.toLowerCase() ?? null

    // Decisión del PO: un contacto repetido no bloquea; solo se avisa.
    const contactoRepetido = todosLosProspectos().some(
      (p) => (datos.telefono && p.telefono === datos.telefono) || (correo && p.correo === correo),
    )
    const actor = actorDe(request)
    const ahora = new Date().toISOString()
    const prospecto = agregarProspecto(
      {
        nombre: datos.nombre.trim(),
        telefono: datos.telefono ?? null,
        correo,
        etapa: 'PRIMER_CONTACTO',
        // El prospecto queda asignado a quien lo registra.
        vendedorId: actor?.uid ?? 1,
        creadoEn: ahora,
        ultimoCambio: ahora,
        cierrePendiente: false,
      },
      nombreDe(actor),
    )
    return HttpResponse.json({ ...prospecto, contactoRepetido }, { status: 201 })
  }),

  http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ params, request }) => {
    const ruta = `${URL_PROSPECTOS}/${params.id}/etapa`
    const actor = actorDe(request)
    const { etapa, motivoCierre, clienteRechazaApp, correoCliente, precioTotal, datosFiscales } =
      (await request.json()) as {
        etapa?: unknown
        motivoCierre?: unknown
        clienteRechazaApp?: unknown
        correoCliente?: unknown
        precioTotal?: unknown
        datosFiscales?: unknown
      }
    if (!esEtapa(etapa)) {
      return apiError(400, 'Bad Request', 'Etapa no válida', ruta)
    }
    // Decisión del PO: el vendedor mueve sus prospectos; Contabilidad y
    // Facturación avanzan Pago y Facturación desde el ERP.
    const rol = actor?.roles[0]
    const permitido =
      !actor ||
      rol === 'VENTAS' ||
      (rol === 'CONTABILIDAD' && etapa === 'FACTURACION') ||
      (rol === 'FACTURACION' && etapa === 'ENTREGA')
    if (!permitido) {
      return apiError(403, 'Forbidden', 'Tu rol no puede pasar el prospecto a esa etapa', ruta)
    }
    const prospecto = visible(Number(params.id), actor)
    if (!prospecto) {
      return apiError(404, 'Not Found', `No existe el prospecto ${params.id}`, ruta)
    }
    if (etapa === prospecto.etapa) {
      return HttpResponse.json(prospecto)
    }

    if (rol === 'CONTABILIDAD' || rol === 'FACTURACION') {
      const esperada = rol === 'CONTABILIDAD' ? 'PAGO' : 'FACTURACION'
      if (prospecto.etapa !== esperada) {
        return apiError(409, 'Conflict', 'El prospecto no está en la etapa esperada', ruta)
      }
      moverProspecto(prospecto, etapa, 'ERP', nombreDe(actor))
      return HttpResponse.json(prospecto)
    }

    const bloqueo = bloqueoDelVendedor(prospecto.etapa, etapa)
    if (bloqueo) {
      return apiError(409, 'Conflict', bloqueo, ruta)
    }
    // Al pasar a Pago el vendedor captura el precio total (ERP-1.1).
    if (etapa === 'PAGO') {
      if (typeof precioTotal !== 'number' || precioTotal <= 0) {
        return apiError(400, 'Bad Request', 'Captura el precio total de la venta', ruta)
      }
      // Y los datos fiscales del cliente para la factura (ERP-1.3).
      if (datosFiscales === undefined || datosFiscales === null) {
        return apiError(400, 'Bad Request', 'Captura los datos fiscales del cliente para la factura', ruta)
      }
      const fiscales = conDescripcion(datosFiscales)
      if (!fiscales) {
        return apiError(400, 'Bad Request', 'Los datos fiscales no son válidos', ruta)
      }
      prospecto.precioTotal = precioTotal
      prospecto.datosFiscales = fiscales
    }
    // Para finalizar hace falta el correo, salvo que el cliente no quiera la app.
    if (etapa === 'FINALIZADO' && clienteRechazaApp !== true) {
      if (typeof correoCliente === 'string' && correoCliente.trim()) {
        prospecto.correo = correoCliente.trim().toLowerCase()
      }
      if (!prospecto.correo) {
        return apiError(
          400,
          'Bad Request',
          'Captura el correo del cliente para crear su cuenta de la app, o marca que no la quiere',
          ruta,
        )
      }
    }
    if (etapa === 'CERRADO') {
      if (!esMotivoCierre(motivoCierre)) {
        return apiError(400, 'Bad Request', 'El motivo de cierre es obligatorio', ruta)
      }
      prospecto.motivoCierre = motivoCierre
      prospecto.ultimaEtapa = prospecto.etapa
    }
    moverProspecto(prospecto, etapa, 'CRM', nombreDe(actor))
    return HttpResponse.json(prospecto)
  }),

  http.post(`${URL_PROSPECTOS}/:id/solicitudes-cierre`, async ({ params, request }) => {
    const ruta = `${URL_PROSPECTOS}/${params.id}/solicitudes-cierre`
    const actor = actorDe(request)
    if (actor && !esVendedor(actor)) {
      return apiError(403, 'Forbidden', 'Solo el vendedor solicita el cierre de sus prospectos', ruta)
    }
    const prospecto = visible(Number(params.id), actor)
    if (!prospecto) {
      return apiError(404, 'Not Found', `No existe el prospecto ${params.id}`, ruta)
    }
    const { motivo } = (await request.json()) as { motivo?: unknown }
    if (!esMotivoCierre(motivo)) {
      return apiError(400, 'Bad Request', 'El motivo de cierre es obligatorio', ruta)
    }
    if (!estaEnProcesoDeVenta(prospecto.etapa)) {
      return apiError(409, 'Conflict', 'Solo se solicita el cierre desde Pago, Facturación o Entrega', ruta)
    }
    if (prospecto.cierrePendiente) {
      return apiError(409, 'Conflict', 'Este prospecto ya tiene una solicitud de cierre pendiente', ruta)
    }
    prospecto.cierrePendiente = true
    return HttpResponse.json(
      {
        id: prospecto.id,
        prospectoId: prospecto.id,
        prospectoNombre: prospecto.nombre,
        etapa: prospecto.etapa,
        motivo,
        estado: 'PENDIENTE',
      },
      { status: 201 },
    )
  }),
]

/** Valida los datos fiscales como el backend y les agrega la descripción del régimen. */
function conDescripcion(cuerpo: unknown) {
  const resultado = esquemaDatosFiscales.safeParse(cuerpo)
  if (!resultado.success) return null
  const regimen = REGIMENES_FISCALES.find((r) => r.clave === resultado.data.regimenFiscal)
  return { ...resultado.data, regimenFiscalDescripcion: regimen?.descripcion ?? '' }
}
