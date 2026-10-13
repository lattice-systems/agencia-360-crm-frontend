// Etapas del prospecto decididas por el PO el 9 de octubre (modelo de datos v1),
// en el orden del embudo de venta.
export const ETAPAS = [
  'PRIMER_CONTACTO',
  'VISITA',
  'COTIZACION',
  'PAGO',
  'FACTURACION',
  'ENTREGA',
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
  CERRADO: 'Cerrado',
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
  /** Solo si está cerrado. */
  motivoCierre?: string | null
  /** Etapa en la que estaba al cerrarse; solo si está cerrado. */
  ultimaEtapa?: Etapa | null
}
