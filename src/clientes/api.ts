import { peticion } from '../api/cliente.ts'

// Endpoints del módulo clientes en el backend (CRM-1.5). Los clientes están
// separados de los usuarios internos; solo los consulta el Gerente de marketing.
export const URL_CLIENTES = '/api/v1/clientes'

export interface ClienteResumen {
  id: number
  nombre: string
  /** Vacío si el cliente rechazó la app. */
  correo: string | null
  telefono: string | null
  /** Cuántos vehículos tiene. */
  vehiculos: number
  creadoEn: string
}

export interface VehiculoCliente {
  id: number
  vin: string
  modelo: string
  anio: number
  placas: string | null
  kilometraje: number | null
}

export interface ClienteDetalle {
  id: number
  nombre: string
  correo: string | null
  telefono: string | null
  creadoEn: string
  vehiculos: VehiculoCliente[]
}

export function listarClientes(): Promise<ClienteResumen[]> {
  return peticion(URL_CLIENTES)
}

export function obtenerCliente(id: number): Promise<ClienteDetalle> {
  return peticion(`${URL_CLIENTES}/${id}`)
}
