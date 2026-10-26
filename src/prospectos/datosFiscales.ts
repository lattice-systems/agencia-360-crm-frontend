import { z } from 'zod'

/**
 * Régimen fiscal del cliente, del catálogo c_RegimenFiscal del SAT (ERP-1.3).
 * El backend recibe la clave y regresa también la descripción.
 */
export const REGIMENES_FISCALES = [
  { clave: '601', descripcion: 'General de Ley Personas Morales' },
  { clave: '603', descripcion: 'Personas Morales con Fines no Lucrativos' },
  { clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { clave: '606', descripcion: 'Arrendamiento' },
  { clave: '607', descripcion: 'Régimen de Enajenación o Adquisición de Bienes' },
  { clave: '608', descripcion: 'Demás ingresos' },
  {
    clave: '610',
    descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México',
  },
  { clave: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)' },
  {
    clave: '612',
    descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales',
  },
  { clave: '614', descripcion: 'Ingresos por intereses' },
  { clave: '615', descripcion: 'Régimen de los ingresos por obtención de premios' },
  { clave: '616', descripcion: 'Sin obligaciones fiscales' },
  {
    clave: '620',
    descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  },
  { clave: '621', descripcion: 'Incorporación Fiscal' },
  { clave: '622', descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { clave: '623', descripcion: 'Opcional para Grupos de Sociedades' },
  { clave: '624', descripcion: 'Coordinados' },
  {
    clave: '625',
    descripcion:
      'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  },
  { clave: '626', descripcion: 'Régimen Simplificado de Confianza' },
] as const

const CLAVES_REGIMEN: readonly string[] = REGIMENES_FISCALES.map((r) => r.clave)

/**
 * Persona moral (3 letras) o física (4), fecha AAMMDD válida y homoclave de 3.
 * Es la misma regla que aplica el backend.
 */
const RFC = /^[A-ZÑ&]{3,4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z\d]{3}$/

/** Datos fiscales del cliente como los manda el CRM. */
export interface DatosFiscales {
  rfc: string
  nombre: string
  domicilio: string
  /** Clave del catálogo del SAT, por ejemplo "612". */
  regimenFiscal: string
}

/** Como los regresa el backend: con la descripción del régimen. */
export interface DatosFiscalesVista extends DatosFiscales {
  regimenFiscalDescripcion: string
}

/**
 * Lo que captura el vendedor al pasar a Pago (ERP-1.3, decisión del PO del 21
 * de octubre). Deja el RFC en mayúsculas y sin espacios alrededor.
 */
export const esquemaDatosFiscales = z.object({
  rfc: z
    .string()
    .transform((rfc) => rfc.trim().toUpperCase())
    .pipe(
      z
        .string()
        .min(1, 'Escribe el RFC del cliente.')
        .regex(RFC, 'El RFC no tiene un formato válido, por ejemplo LOHA850101AB1.'),
    ),
  nombre: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre completo como aparece en su constancia fiscal.')
    .max(200, 'El nombre admite hasta 200 caracteres.'),
  domicilio: z
    .string()
    .trim()
    .min(1, 'Escribe el domicilio fiscal.')
    .max(250, 'El domicilio admite hasta 250 caracteres.'),
  regimenFiscal: z
    .string()
    .refine((clave) => CLAVES_REGIMEN.includes(clave), 'Elige el régimen fiscal.'),
})

export type ErroresDatosFiscales = Partial<Record<keyof DatosFiscales, string>>

/** Valida lo capturado; regresa los datos limpios o el primer error de cada campo. */
export function validarDatosFiscales(
  capturados: DatosFiscales,
): { datos: DatosFiscales; errores?: undefined } | { datos?: undefined; errores: ErroresDatosFiscales } {
  const resultado = esquemaDatosFiscales.safeParse(capturados)
  if (resultado.success) return { datos: resultado.data }
  const errores: ErroresDatosFiscales = {}
  for (const problema of resultado.error.issues) {
    const campo = problema.path[0] as keyof DatosFiscales
    errores[campo] ??= problema.message
  }
  return { errores }
}

export const DATOS_FISCALES_VACIOS: DatosFiscales = {
  rfc: '',
  nombre: '',
  domicilio: '',
  regimenFiscal: '',
}
