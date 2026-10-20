// Etapas del prospecto en el orden del embudo (decisiones del PO del 9 y 12 de
// octubre). Quién mueve cada una:
// - Primer contacto, Visita y Cotización: el vendedor, incluso hacia atrás o
//   saltándose alguna; desde ahí puede pasar a Pago o cerrar con motivo.
// - Pago: la avanza Contabilidad al validar el pago (desde el ERP).
// - Facturación: la avanza Facturación al emitir la factura (desde el ERP).
// - Entrega: el vendedor la marca como Finalizado al entregar la unidad.
// - Desde Pago, cerrar requiere que el Administrador apruebe una solicitud.
export const ETAPAS = [
  'PRIMER_CONTACTO',
  'VISITA',
  'COTIZACION',
  'PAGO',
  'FACTURACION',
  'ENTREGA',
  'FINALIZADO',
  'CERRADO',
] as const

export type Etapa = (typeof ETAPAS)[number]

export const NOMBRES_ETAPA: Record<Etapa, string> = {
  PRIMER_CONTACTO: 'Primer contacto',
  VISITA: 'Visita',
  COTIZACION: 'Cotización',
  PAGO: 'Pago',
  FACTURACION: 'Facturación',
  ENTREGA: 'Entrega',
  FINALIZADO: 'Finalizado',
  CERRADO: 'Cerrado',
}

const INICIALES: readonly Etapa[] = ['PRIMER_CONTACTO', 'VISITA', 'COTIZACION']
const EN_PROCESO_DE_VENTA: readonly Etapa[] = ['PAGO', 'FACTURACION', 'ENTREGA']

/** Primer contacto, Visita o Cotización: el vendedor la cambia libremente. */
export function esEtapaInicial(etapa: Etapa): boolean {
  return INICIALES.includes(etapa)
}

/** Pago, Facturación o Entrega: para cerrar hace falta una solicitud. */
export function estaEnProcesoDeVenta(etapa: Etapa): boolean {
  return EN_PROCESO_DE_VENTA.includes(etapa)
}

/** Etapas a las que el vendedor puede pasar un prospecto en una etapa inicial. */
export function etapasDestinoDelVendedor(actual: Etapa): Etapa[] {
  const destinos: Etapa[] = [...INICIALES, 'PAGO', 'CERRADO']
  return destinos.filter((etapa) => etapa !== actual)
}

/** Quién avanza un prospecto que el vendedor no puede mover. */
export const RESPONSABLE_DE_ETAPA: Partial<Record<Etapa, string>> = {
  PAGO: 'Contabilidad valida el pago',
  FACTURACION: 'Facturación emite la factura',
}

// Motivos de cierre fijos (CRM-1.2, decisión del PO para el Sprint 2).
export const MOTIVOS_CIERRE = [
  'SE_FUE_POR_OTRA_MARCA',
  'PERDIO_EL_INTERES',
  'RECHAZO_DE_FINANCIAMIENTO',
] as const

/** SIN_CATEGORIA solo lo tienen los cierres de antes, cuando el motivo era texto libre. */
export type MotivoCierre = (typeof MOTIVOS_CIERRE)[number] | 'SIN_CATEGORIA'

export const NOMBRES_MOTIVO: Record<MotivoCierre, string> = {
  SE_FUE_POR_OTRA_MARCA: 'Se fue por otra marca',
  PERDIO_EL_INTERES: 'Perdió el interés',
  RECHAZO_DE_FINANCIAMIENTO: 'Rechazo de financiamiento',
  SIN_CATEGORIA: 'Sin categoría',
}

export interface ProspectoNuevo {
  nombre: string
  telefono?: string
  correo?: string
}

export interface Prospecto {
  id: number
  nombre: string
  telefono: string | null
  correo: string | null
  etapa: Etapa
  vendedorId: number
  creadoEn: string
  /** Fecha y hora del último cambio de etapa. */
  ultimoCambio?: string
  /** Solo si está cerrado. */
  motivoCierre?: MotivoCierre | null
  /** Etapa en la que estaba al cerrarse; solo si está cerrado. */
  ultimaEtapa?: Etapa | null
  /** Hay una solicitud de cierre esperando al Administrador. */
  cierrePendiente?: boolean
  /** Precio total de la venta; lo captura el vendedor al pasar a Pago (ERP-1.1). */
  precioTotal?: number | null
  /** Solo en finalizados: la unidad que eligió Facturación (CRM-1.4). */
  vehiculo?: VehiculoVendido | null
}

/** En pantalla, `modelo` es el Tipo (Sentra) y `anio` el Modelo (2026), como en la factura. */
export interface VehiculoVendido {
  vin: string
  modelo: string
  anio: number
}

/** Respuesta del registro: el prospecto y si su contacto ya existía. */
export type ProspectoRegistrado = Prospecto & { contactoRepetido: boolean }

export interface Movimiento {
  etapa: Etapa
  origen: 'CRM' | 'ERP'
  fechaHora: string
  usuarioNombre: string | null
}

export interface SolicitudCierre {
  id: number
  prospectoId: number
  prospectoNombre: string
  etapa: Etapa
  motivo: MotivoCierre
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'
}
