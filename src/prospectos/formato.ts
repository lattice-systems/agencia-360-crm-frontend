// Formatos de los mockups: "477 555 0101", "13 oct, 10:24" y
// "13 oct 2026, 10:24 a. m.".

/** Teléfono de México a 10 dígitos agrupado como 3-3-4. */
export function formatearTelefono(telefono: string | null): string {
  if (!telefono) return ''
  const digitos = telefono.replace(/\D/g, '')
  return digitos.length === 10
    ? `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`
    : telefono
}

// Monto capturado en un campo de texto: acepta "$489,900.00", "489900" o
// "489900.5". NaN si no es un monto con hasta 10 enteros y 2 decimales (lo que
// admite numeric(12,2) en el backend).
const MONTO = /^\d{1,10}(\.\d{1,2})?$/

export function textoAMonto(texto: string): number {
  const limpio = texto.replace(/[\s$,]/g, '').replace(/MXN$/i, '')
  return MONTO.test(limpio) ? Number(limpio) : Number.NaN
}

/** Solo los dígitos de un teléfono capturado con espacios, guiones o paréntesis. */
export function soloDigitos(telefono: string): string {
  return telefono.replace(/[\s().-]/g, '')
}

const fechaCorta = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const soloFecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const fechaLarga = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** "13 oct, 10:24" (columna Último cambio). */
export function formatearFechaCorta(iso: string): string {
  const partes = fechaCorta.formatToParts(new Date(iso))
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? ''
  return `${valor('day')} ${valor('month').replace('.', '')}, ${valor('hour')}:${valor('minute')}`
}

/** "13 oct 2026" (fecha de entrega en Finalizados). */
export function formatearFecha(iso: string): string {
  return soloFecha.format(new Date(iso)).replace(/([a-z]{3})\./, '$1')
}

/** "13 oct 2026, 10:24 a.m." (historial de etapas). */
export function formatearFechaLarga(iso: string): string {
  // Algunos navegadores abrevian el mes con punto ("oct."); el mockup no lo usa.
  return fechaLarga.format(new Date(iso)).replace(/([a-z]{3})\. /, '$1 ')
}
