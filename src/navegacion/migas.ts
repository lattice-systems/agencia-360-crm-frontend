import { matchPath } from 'react-router'
import { SECCIONES, seccionDe } from './secciones.ts'

export interface Miga {
  texto: string
  /** Sin ruta, es la página actual. */
  ruta?: string
}

/**
 * Migas de pan de una ruta (CRM-UX-2). El CRM no tiene página de Inicio (cada
 * rol abre en su primera sección), así que empiezan en la sección del menú; si
 * la sección cuelga de otra (Registrar de Prospectos), primero va esa. Salen
 * de `secciones.ts`, así que una sección nueva las tiene sin hacer nada más.
 */
export function migasDe(ruta: string): Miga[] {
  const seccion = seccionDe(ruta)
  if (!seccion) {
    return [{ texto: 'Inicio' }]
  }
  const padre = SECCIONES.find((otra) => otra.ruta === seccion.padre)
  if (padre) {
    return [
      { texto: padre.titulo, ruta: padre.ruta },
      { texto: seccion.tituloEnMigas ?? seccion.titulo },
    ]
  }
  const subpagina = seccion.subpaginas?.find((pagina) => matchPath(pagina.ruta, ruta))
  if (!subpagina) {
    return [{ texto: seccion.titulo }]
  }
  return [{ texto: seccion.titulo, ruta: seccion.ruta }, { texto: subpagina.titulo }]
}
