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

export interface ClienteNuevo {
  nombre: string
  correo?: string
  telefono?: string
}

export interface VehiculoNuevo {
  vin: string
  modelo: string
  anio: number
}

export type EstadoCuenta = 'SIN_CUENTA' | 'ACTIVA' | 'DESACTIVADA'

/** Cuenta de la app del cliente (CRM-1.3). */
export interface CuentaApp {
  clienteId: number
  estado: EstadoCuenta
  /** true si el cliente aún no entra por primera vez. */
  debeCambiarContrasena: boolean
}

/** CRM-1.3: alta manual para casos especiales. */
export function registrarCliente(datos: ClienteNuevo): Promise<ClienteDetalle> {
  return peticion(URL_CLIENTES, { metodo: 'POST', cuerpo: datos })
}

export function asignarVehiculo(
  clienteId: number,
  vehiculo: VehiculoNuevo,
): Promise<ClienteDetalle> {
  return peticion(`${URL_CLIENTES}/${clienteId}/vehiculos`, {
    metodo: 'POST',
    cuerpo: vehiculo,
  })
}

const urlCuenta = (clienteId: number) => `${URL_CLIENTES}/${clienteId}/cuenta-app`

export function obtenerCuentaApp(clienteId: number): Promise<CuentaApp> {
  return peticion(urlCuenta(clienteId))
}

/** Abre la cuenta; el backend manda la contraseña temporal al correo del cliente. */
export function abrirCuentaApp(clienteId: number): Promise<CuentaApp> {
  return peticion(urlCuenta(clienteId), { metodo: 'POST' })
}

export function desactivarCuentaApp(clienteId: number): Promise<CuentaApp> {
  return peticion(`${urlCuenta(clienteId)}/desactivar`, { metodo: 'POST' })
}

export function activarCuentaApp(clienteId: number): Promise<CuentaApp> {
  return peticion(`${urlCuenta(clienteId)}/activar`, { metodo: 'POST' })
}
