import type { Prospecto } from '../prospectos/tipos.ts'

// Datos en memoria que usan los handlers de MSW mientras no existe el backend.
// Se reinician antes de cada prueba (ver src/test/setup.ts).

// El teléfono y el correo de Rosa Díaz sirven para probar el aviso de duplicado.
export const TELEFONO_REPETIDO = '5500000000'
export const CORREO_REPETIDO = 'repetido@ejemplo.com'

const PROSPECTOS_INICIALES: readonly Prospecto[] = [
  {
    id: 1,
    nombre: 'Rosa Díaz',
    telefono: TELEFONO_REPETIDO,
    correo: CORREO_REPETIDO,
    etapa: 'PRIMER_CONTACTO',
    vendedorId: 1,
    creadoEn: '2026-10-10T16:30:00Z',
  },
  {
    id: 2,
    nombre: 'Jorge Ramírez',
    telefono: '4779876543',
    correo: null,
    etapa: 'VISITA',
    vendedorId: 1,
    creadoEn: '2026-10-11T17:00:00Z',
  },
  {
    id: 3,
    nombre: 'Marta Hernández',
    telefono: null,
    correo: 'marta@ejemplo.com',
    etapa: 'COTIZACION',
    vendedorId: 1,
    creadoEn: '2026-10-12T15:45:00Z',
  },
]

let prospectos: Prospecto[] = []
let siguienteId = 1

export function reiniciarDatos(iniciales = PROSPECTOS_INICIALES) {
  prospectos = iniciales.map((p) => ({ ...p }))
  siguienteId = Math.max(0, ...prospectos.map((p) => p.id)) + 1
}

export function todosLosProspectos(): Prospecto[] {
  return prospectos
}

export function buscarProspecto(id: number): Prospecto | undefined {
  return prospectos.find((p) => p.id === id)
}

export function agregarProspecto(datos: Omit<Prospecto, 'id'>): Prospecto {
  const nuevo = { ...datos, id: siguienteId++ }
  prospectos.push(nuevo)
  return nuevo
}

reiniciarDatos()
