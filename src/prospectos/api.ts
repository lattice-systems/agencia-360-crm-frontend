import { peticion } from '../api/cliente.ts'
import type { DatosFiscales } from './datosFiscales.ts'
import type {
  Etapa,
  MotivoCierre,
  Movimiento,
  Prospecto,
  ProspectoNuevo,
  ProspectoRegistrado,
  SolicitudCierre,
} from './tipos.ts'

// Endpoints de ventascrm en el backend (CRM-1.0 y CRM-1.1). Los errores llegan
// como ErrorApi con el mensaje del backend (ver api/cliente.ts).
export const URL_PROSPECTOS = '/api/v1/prospectos'

/**
 * CRM-1.0. Un teléfono o correo repetido no bloquea (decisión del PO): el
 * backend registra y avisa con contactoRepetido.
 */
export function registrarProspecto(
  datos: ProspectoNuevo,
): Promise<ProspectoRegistrado> {
  return peticion(URL_PROSPECTOS, { metodo: 'POST', cuerpo: datos })
}

/** Revisa, mientras se captura, si el teléfono o el correo ya existen. */
export async function hayContactoRepetido(contacto: {
  telefono?: string
  correo?: string
}): Promise<boolean> {
  const parametros = new URLSearchParams()
  if (contacto.telefono) parametros.set('telefono', contacto.telefono)
  if (contacto.correo) parametros.set('correo', contacto.correo)
  const { contactoRepetido } = await peticion<{ contactoRepetido: boolean }>(
    `${URL_PROSPECTOS}/coincidencias?${parametros}`,
  )
  return contactoRepetido
}

/** CRM-1.1: el servidor solo devuelve los prospectos que el usuario puede ver. */
export function listarProspectos(): Promise<Prospecto[]> {
  return peticion(URL_PROSPECTOS)
}

/** Historial de etapas, del más antiguo al más reciente. */
export function historialDe(id: number): Promise<Movimiento[]> {
  return peticion(`${URL_PROSPECTOS}/${id}/historial`)
}

/**
 * CRM-1.1: el servidor registra el cambio con fecha y hora en el historial.
 * Para pasar a Cerrado el motivo es obligatorio y es uno de los fijos (CRM-1.2).
 */
export function cambiarEtapa(
  id: number,
  etapa: Etapa,
  motivoCierre?: MotivoCierre,
  {
    clienteRechazaApp = false,
    correoCliente,
    precioTotal,
    datosFiscales,
  }: {
    clienteRechazaApp?: boolean
    correoCliente?: string
    precioTotal?: number
    datosFiscales?: DatosFiscales
  } = {},
): Promise<Prospecto> {
  // Al finalizar: si el cliente no quiere la app, no se le crea la cuenta; si
  // sí la quiere y el prospecto no tiene correo, se manda el que capturó el
  // vendedor.
  return peticion(`${URL_PROSPECTOS}/${id}/etapa`, {
    metodo: 'PATCH',
    cuerpo: {
      etapa,
      ...(motivoCierre === undefined ? {} : { motivoCierre }),
      ...(clienteRechazaApp ? { clienteRechazaApp } : {}),
      ...(correoCliente ? { correoCliente } : {}),
      ...(precioTotal !== undefined ? { precioTotal } : {}),
      ...(datosFiscales ? { datosFiscales } : {}),
    },
  })
}

/**
 * ERP-1.3: el vendedor captura o corrige los datos fiscales de su prospecto
 * mientras está en Pago. Sin ellos Contabilidad no puede validar los pagos.
 */
export function capturarDatosFiscales(id: number, datosFiscales: DatosFiscales): Promise<Prospecto> {
  return peticion(`${URL_PROSPECTOS}/${id}/datos-fiscales`, {
    metodo: 'PUT',
    cuerpo: datosFiscales,
  })
}

/** Desde Pago en adelante el cierre lo aprueba el Administrador. */
export function solicitarCierre(
  id: number,
  motivo: MotivoCierre,
): Promise<SolicitudCierre> {
  return peticion(`${URL_PROSPECTOS}/${id}/solicitudes-cierre`, {
    metodo: 'POST',
    cuerpo: { motivo },
  })
}
