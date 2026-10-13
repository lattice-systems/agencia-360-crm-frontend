import { listarUsuarios, type UsuarioApi } from '../api/acceso.ts'
import { peticion } from '../api/cliente.ts'
import { URL_PROSPECTOS } from './api.ts'
import type { Prospecto } from './tipos.ts'

// CRM-0.1: el Gerente de marketing reasigna prospectos entre vendedores.

/** Vendedores activos a los que se puede asignar un prospecto. */
export async function listarVendedores(): Promise<UsuarioApi[]> {
  const usuarios = await listarUsuarios()
  return usuarios.filter((u) => u.rol === 'VENTAS' && u.activo)
}

export function reasignarProspecto(id: number, vendedorId: number) {
  return peticion<Prospecto>(`${URL_PROSPECTOS}/${id}/vendedor`, {
    metodo: 'PUT',
    cuerpo: { vendedorId },
  })
}
