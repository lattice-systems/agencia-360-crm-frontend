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

/** Entidades federativas, para el estado del domicilio fiscal. */
export const ESTADOS = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
] as const

/**
 * Domicilio fiscal separado como lo pidió el PO el 26 de octubre: estado,
 * ciudad, colonia, calle y número, y código postal.
 */
export interface DomicilioFiscal {
  estado: string
  ciudad: string
  colonia: string
  calleNumero: string
  codigoPostal: string
}

/** Datos fiscales del cliente como los manda el CRM. */
export interface DatosFiscales {
  rfc: string
  nombre: string
  domicilio: DomicilioFiscal
  /** Clave del catálogo del SAT, por ejemplo "612". */
  regimenFiscal: string
}

/** Como los regresa el backend: con la descripción del régimen. */
export interface DatosFiscalesVista extends DatosFiscales {
  regimenFiscalDescripcion: string
}

const ESTADOS_VALIDOS: readonly string[] = ESTADOS

/** Texto obligatorio con largo máximo; los largos son los del backend. */
function texto(vacio: string, maximo: number, largo: string) {
  return z.string().trim().min(1, vacio).max(maximo, largo)
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
  nombre: texto(
    'Escribe el nombre completo como aparece en su constancia fiscal.',
    200,
    'El nombre admite hasta 200 caracteres.',
  ),
  domicilio: z.object({
    estado: z.string().refine((estado) => ESTADOS_VALIDOS.includes(estado), 'Elige el estado.'),
    ciudad: texto('Escribe la ciudad.', 60, 'La ciudad admite hasta 60 caracteres.'),
    colonia: texto('Escribe la colonia.', 80, 'La colonia admite hasta 80 caracteres.'),
    calleNumero: texto(
      'Escribe la calle y el número.',
      90,
      'La calle y el número admiten hasta 90 caracteres.',
    ),
    codigoPostal: z
      .string()
      .trim()
      .regex(/^\d{5}$/, 'El código postal son 5 dígitos.'),
  }),
  regimenFiscal: z
    .string()
    .refine((clave) => CLAVES_REGIMEN.includes(clave), 'Elige el régimen fiscal.'),
})

/** Los campos del formulario: los del cliente y los del domicilio. */
export type CampoFiscal = Exclude<keyof DatosFiscales, 'domicilio'> | keyof DomicilioFiscal

export type ErroresDatosFiscales = Partial<Record<CampoFiscal, string>>

/** Valida lo capturado; regresa los datos limpios o el primer error de cada campo. */
export function validarDatosFiscales(
  capturados: DatosFiscales,
): { datos: DatosFiscales; errores?: undefined } | { datos?: undefined; errores: ErroresDatosFiscales } {
  const resultado = esquemaDatosFiscales.safeParse(capturados)
  if (resultado.success) return { datos: resultado.data }
  const errores: ErroresDatosFiscales = {}
  for (const problema of resultado.error.issues) {
    // Los del domicilio vienen como ['domicilio', 'colonia']: cuenta el último.
    const campo = problema.path[problema.path.length - 1] as CampoFiscal
    errores[campo] ??= problema.message
  }
  return { errores }
}

export const DATOS_FISCALES_VACIOS: DatosFiscales = {
  rfc: '',
  nombre: '',
  domicilio: { estado: '', ciudad: '', colonia: '', calleNumero: '', codigoPostal: '' },
  regimenFiscal: '',
}
