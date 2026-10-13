// Endpoints del módulo de acceso del backend (login, usuarios y roles).
import { peticion } from './cliente.ts'

export type Rol =
  | 'ADMINISTRADOR'
  | 'GERENTE_MARKETING'
  | 'VENTAS'
  | 'FACTURACION'
  | 'INVENTARIO'
  | 'SERVICIO'
  | 'REFACCIONES'
  | 'CAJA'
  | 'CONTABILIDAD'

export interface SesionApi {
  accessToken: string
  tipo: string
  usuario: string
  nombre: string
  rol: Rol
  aplicacion: 'ERP' | 'CRM'
}

export interface UsuarioApi {
  id: number
  usuario: string
  nombre: string
  rol: Rol
  activo: boolean
}

export interface RolApi {
  nombre: Rol
  descripcion: string
  accesoErp: boolean
  accesoCrm: boolean
}

export interface NuevoUsuario {
  usuario: string
  contrasena: string
  nombre: string
  rol: Rol
}

export const URL_LOGIN = '/api/v1/auth/login'
export const URL_USUARIOS = '/api/v1/usuarios'
export const URL_ROLES = '/api/v1/roles'

export function iniciarSesion(usuario: string, contrasena: string) {
  return peticion<SesionApi>(URL_LOGIN, {
    metodo: 'POST',
    cuerpo: { usuario, contrasena, aplicacion: 'CRM' },
  })
}

export function listarUsuarios() {
  return peticion<UsuarioApi[]>(URL_USUARIOS)
}

export function listarRoles() {
  return peticion<RolApi[]>(URL_ROLES)
}

export function crearUsuario(nuevo: NuevoUsuario) {
  return peticion<UsuarioApi>(URL_USUARIOS, { metodo: 'POST', cuerpo: nuevo })
}

export function cambiarRol(usuarioId: number, rol: Rol) {
  return peticion<UsuarioApi>(`${URL_USUARIOS}/${usuarioId}/rol`, {
    metodo: 'PUT',
    cuerpo: { rol },
  })
}
