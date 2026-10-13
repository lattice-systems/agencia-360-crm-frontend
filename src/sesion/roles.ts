import type { Rol } from '../api/acceso.ts'

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE_MARKETING: 'Gerente de marketing',
  VENTAS: 'Ventas',
  FACTURACION: 'Facturación',
  INVENTARIO: 'Inventario',
  SERVICIO: 'Servicio',
  REFACCIONES: 'Refacciones',
  CAJA: 'Caja',
  CONTABILIDAD: 'Contabilidad',
}
